import { PPToken, PPTokenKind } from "./ppLexer";
import { PreprocessorError } from "./errors";
import { PositionMap, SourcePosition } from "./position";
import { MacroDefinition, MacroTable, validateReplacementList } from "./macroTable";
import { expand, withFreshHideSets } from "./expand";
import { evaluateControllingExpression } from "./conditionalExpr";
import { lex } from "./lex";

const ZERO = BigInt(0); // see conditionalExpr.ts - no 0n literals under this ES6 target

export interface PreprocessorOptions {
  /**
   * Resolves a quoted #include's name to that file's own source text, or `null` if
   * it can't be found. Defaults to always returning `null` - there is no multi-file
   * concept anywhere else in this interpreter yet (see B7); this hook exists so B7
   * only ever needs to supply a real resolver, not touch this file again.
   */
  resolveLocalInclude?: (name: string) => string | null;
}

export interface IncludedFile {
  name: string;
  tokens: PPToken[];
  map: PositionMap;
}

// (6.10p2) a preprocessing directive is a line whose first token is '#'. Nothing
// before phase 4 tokenizes whitespace, so "first token on a line" already means
// "first non-whitespace thing on the line" with no further checking needed.
const groupIntoLines = (tokens: readonly PPToken[]): PPToken[][] => {
  const lines: PPToken[][] = [];
  let current: PPToken[] = [];
  let currentLine = tokens.length > 0 ? tokens[0].line : 1;
  for (const t of tokens) {
    if (t.line !== currentLine) {
      lines.push(current);
      current = [];
      currentLine = t.line;
    }
    current.push(t);
  }
  if (current.length > 0) lines.push(current);
  return lines;
};

const isDirectiveLine = (line: readonly PPToken[]): boolean =>
  line.length > 0 && line[0].kind === PPTokenKind.Punctuator && line[0].text === "#";

const posOf = (t: PPToken, map: PositionMap): SourcePosition => map.resolve(t.start);

const parseDefine = (rest: readonly PPToken[], pos: SourcePosition): MacroDefinition => {
  if (rest.length === 0 || rest[0].kind !== PPTokenKind.Identifier)
    throw new PreprocessorError(pos, "macro name missing");
  const name = rest[0].text;

  const isFunctionLike =
    rest.length > 1 &&
    rest[1].kind === PPTokenKind.Punctuator &&
    rest[1].text === "(" &&
    !rest[1].hasLeadingWhitespace;

  const parameters: string[] = [];
  let isVariadic = false;
  let bodyStart = 1;

  if (isFunctionLike) {
    let i = 2;
    for (;;) {
      const tok = rest[i];
      if (tok === undefined) throw new PreprocessorError(pos, "missing ')' in macro parameter list");
      if (tok.text === ")") {
        i++;
        break;
      }
      if (tok.text === "...") {
        isVariadic = true;
        i++;
        if (rest[i]?.text !== ")")
          throw new PreprocessorError(pos, "'...' must be the last macro parameter");
        i++;
        break;
      }
      if (tok.kind !== PPTokenKind.Identifier)
        throw new PreprocessorError(pos, "expected a macro parameter name");
      if (parameters.includes(tok.text))
        throw new PreprocessorError(pos, "duplicate macro parameter '" + tok.text + "'");
      parameters.push(tok.text);
      i++;
      if (rest[i]?.text === ",") {
        i++;
        continue;
      }
      if (rest[i]?.text === ")") {
        i++;
        break;
      }
      throw new PreprocessorError(pos, "expected ',' or ')' in macro parameter list");
    }
    bodyStart = i;
  }

  const replacement = rest.slice(bodyStart);
  validateReplacementList(replacement, isFunctionLike, parameters, isVariadic, pos);

  return { name, isFunctionLike, parameters, isVariadic, replacement };
};

const parseUndef = (rest: readonly PPToken[], pos: SourcePosition): string => {
  if (rest.length === 0 || rest[0].kind !== PPTokenKind.Identifier)
    throw new PreprocessorError(pos, "macro name missing in #undef");
  return rest[0].text;
};

// (6.10.2) #include <name> is always a silent no-op here (scope decision 2 - this
// interpreter's builtins already need no header at all). #include "name" is
// genuinely recognized, but resolving it to real content is routed through an
// injectable hook rather than built here - there is no multi-file concept
// anywhere else in this runtime yet (B7). A successfully-resolved include shares
// the *same* macro table (so #defines cross the include boundary both ways, the
// same as real textual inclusion) and recurses through this same pipeline, which
// is what lets a nested #include inside the included content just work.
const handleInclude = (
  rest: readonly PPToken[],
  pos: SourcePosition,
  table: MacroTable,
  opts: PreprocessorOptions,
  includedFiles: IncludedFile[],
): PPToken[] => {
  const headerTok = rest[0];
  if (headerTok === undefined || headerTok.kind !== PPTokenKind.HeaderName)
    throw new PreprocessorError(
      pos,
      "#include expects <header-name> or \"header-name\" directly, not a macro-expanded name (not yet supported)",
    );

  const isAngleForm = headerTok.text.startsWith("<");
  if (isAngleForm) return [];

  const name = headerTok.text.slice(1, -1);
  const resolve = opts.resolveLocalInclude ?? (() => null);
  const content = resolve(name);
  if (content === null)
    throw new PreprocessorError(
      pos,
      "local #include \"" + name + "\" needs multi-file support, not yet available (see B7)",
    );

  const { tokens: includedTokens, map: includedMap } = lex(content, name);
  const expanded = preprocessTokens(includedTokens, table, includedMap, opts, includedFiles);
  includedFiles.push({ name, tokens: includedTokens, map: includedMap });
  return expanded;
};

// (6.10.1) one open #if/#ifdef/#ifndef group. `active` is whether *this* frame's
// currently-selected branch is the one being emitted; `anyTaken` tracks whether some
// branch in this frame has already been selected, so later #elif/#else know to stay
// skipped even if their own condition would otherwise be true. Overall emit/skip status
// at any point is "every frame on the stack is active" - outer frames never change while
// an inner one is still open, since #elif/#else/#endif only ever act on the innermost.
interface CondFrame {
  active: boolean;
  anyTaken: boolean;
  sawElse: boolean;
  openedBy: "if" | "ifdef" | "ifndef";
  pos: SourcePosition;
}

const isSkipping = (stack: readonly CondFrame[]): boolean => stack.some((f) => !f.active);

const parseIfdefName = (rest: readonly PPToken[], pos: SourcePosition, directive: string): string => {
  if (rest.length === 0 || rest[0].kind !== PPTokenKind.Identifier)
    throw new PreprocessorError(pos, "macro name missing in #" + directive);
  return rest[0].text;
};

/**
 * Recognizes and applies one directive line. #if/#ifdef/#ifndef/#elif/#else/#endif are
 * checked first, unconditionally - 6.10.1 still needs them tracked correctly even while
 * skipping, to keep the stack's nesting right and find the matching #else/#endif. Every
 * other directive (recognized or not) is silently discarded, unexamined, while the
 * enclosing group is skipped; #define/#undef/#include are only ever reached once we
 * know the current group is actually active.
 */
export const processDirective = (
  line: readonly PPToken[],
  table: MacroTable,
  map: PositionMap,
  opts: PreprocessorOptions,
  includedFiles: IncludedFile[],
  condStack: CondFrame[],
): PPToken[] => {
  if (line.length === 1) return []; // (6.10p7) a lone '#' on its own line has no effect
  const directiveNameTok = line[1];
  const pos = posOf(directiveNameTok, map);
  const name = directiveNameTok.kind === PPTokenKind.Identifier ? directiveNameTok.text : null;
  const rest = line.slice(2);
  const skipping = isSkipping(condStack);

  if (name === "if" || name === "ifdef" || name === "ifndef") {
    const parentActive = !skipping;
    let active = false;
    if (parentActive) {
      active =
        name === "if"
          ? evaluateControllingExpression(rest, pos, table) !== ZERO
          : table.isDefined(parseIfdefName(rest, pos, name)) === (name === "ifdef");
    }
    condStack.push({ active, anyTaken: active, sawElse: false, openedBy: name, pos });
    return [];
  }

  if (name === "elif" || name === "else") {
    const top = condStack[condStack.length - 1];
    if (top === undefined) throw new PreprocessorError(pos, "#" + name + " without a matching #if");
    if (top.sawElse) throw new PreprocessorError(pos, "#" + name + " after #else");
    if (name === "else") top.sawElse = true;

    // once some branch in this frame has already been taken, or an enclosing group is
    // itself skipped, later conditions are never even evaluated - matches a skipped
    // group's general tolerance for content that would otherwise need to be valid.
    const enclosingActive = condStack.slice(0, -1).every((f) => f.active);
    if (!enclosingActive || top.anyTaken) {
      top.active = false;
    } else if (name === "else") {
      top.active = true;
      top.anyTaken = true;
    } else {
      top.active = evaluateControllingExpression(rest, pos, table) !== ZERO;
      if (top.active) top.anyTaken = true;
    }
    return [];
  }

  if (name === "endif") {
    if (condStack.length === 0) throw new PreprocessorError(pos, "#endif without a matching #if");
    condStack.pop();
    return [];
  }

  if (skipping) return []; // any other directive is discarded, unexamined, while skipped

  if (name === null) throw new PreprocessorError(pos, "invalid preprocessing directive");
  switch (name) {
    case "define":
      table.define(parseDefine(rest, pos), pos);
      return [];
    case "undef":
      table.undef(parseUndef(rest, pos));
      return [];
    case "include":
      return handleInclude(rest, pos, table, opts, includedFiles);
    default:
      throw new PreprocessorError(pos, "preprocessing directive #" + name + " is not yet implemented");
  }
};

/**
 * Walks the whole token stream once, left to right: a directive line updates
 * `table` (and, for #include, may contribute its already-expanded tokens);
 * everything else is gathered into one contiguous run (up to the next directive
 * line, or end of input) and handed to `expand()` together, since a
 * function-like macro's arguments can legally span several physical lines. A run
 * gathered while a #if/#ifdef/#ifndef group is currently skipped is discarded
 * outright - it was still lexed into pp-tokens (so a nested directive inside it
 * is still recognized), but never macro-expanded and never reaches the output.
 * `condStack` is local to one call: an #include's recursive call gets its own,
 * since a file's own conditionals can't straddle an #include boundary anyway.
 */
export const preprocessTokens = (
  tokens: readonly PPToken[],
  table: MacroTable,
  map: PositionMap,
  opts: PreprocessorOptions = {},
  includedFiles: IncludedFile[] = [],
): PPToken[] => {
  const lines = groupIntoLines(tokens);
  const output: PPToken[] = [];
  const condStack: CondFrame[] = [];
  let i = 0;
  while (i < lines.length) {
    if (isDirectiveLine(lines[i])) {
      output.push(...processDirective(lines[i], table, map, opts, includedFiles, condStack));
      i++;
      continue;
    }
    const skipping = isSkipping(condStack);
    const runLines: PPToken[][] = [];
    while (i < lines.length && !isDirectiveLine(lines[i])) {
      runLines.push(lines[i]);
      i++;
    }
    if (!skipping) {
      const runTokens = runLines.flat();
      const expanded = expand(withFreshHideSets(runTokens), table);
      output.push(...expanded.map((h) => h.token));
    }
  }
  if (condStack.length > 0) {
    const top = condStack[condStack.length - 1];
    throw new PreprocessorError(top.pos, "unterminated #" + top.openedBy + " - missing #endif");
  }
  return output;
};
