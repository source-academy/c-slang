import { PPToken, PPTokenKind } from "./ppLexer";
import { PreprocessorError } from "./errors";
import { PositionMap, SourcePosition } from "./position";
import { MacroDefinition, MacroTable, validateReplacementList } from "./macroTable";
import { expand, withFreshHideSets } from "./expand";
import { lex } from "./lex";

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

/**
 * Recognizes and applies one directive line. #define/#undef/#include are
 * handled here; any other directive name throws a clear "not yet implemented"
 * error rather than being silently mishandled - A7.4 extends this same dispatch
 * with #if and friends.
 */
export const processDirective = (
  line: readonly PPToken[],
  table: MacroTable,
  map: PositionMap,
  opts: PreprocessorOptions,
  includedFiles: IncludedFile[],
): PPToken[] => {
  if (line.length === 1) return []; // (6.10p7) a lone '#' on its own line has no effect
  const directiveNameTok = line[1];
  const pos = posOf(directiveNameTok, map);
  if (directiveNameTok.kind !== PPTokenKind.Identifier)
    throw new PreprocessorError(pos, "invalid preprocessing directive");

  const rest = line.slice(2);
  switch (directiveNameTok.text) {
    case "define":
      table.define(parseDefine(rest, pos), pos);
      return [];
    case "undef":
      table.undef(parseUndef(rest, pos));
      return [];
    case "include":
      return handleInclude(rest, pos, table, opts, includedFiles);
    default:
      throw new PreprocessorError(
        pos,
        "preprocessing directive #" + directiveNameTok.text + " is not yet implemented",
      );
  }
};

/**
 * Walks the whole token stream once, left to right: a directive line updates
 * `table` (and, for #include, may contribute its already-expanded tokens);
 * everything else is gathered into one contiguous run (up to the next directive
 * line, or end of input) and handed to `expand()` together, since a
 * function-like macro's arguments can legally span several physical lines.
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
  let i = 0;
  while (i < lines.length) {
    if (isDirectiveLine(lines[i])) {
      output.push(...processDirective(lines[i], table, map, opts, includedFiles));
      i++;
      continue;
    }
    const runLines: PPToken[][] = [];
    while (i < lines.length && !isDirectiveLine(lines[i])) {
      runLines.push(lines[i]);
      i++;
    }
    const runTokens = runLines.flat();
    const expanded = expand(withFreshHideSets(runTokens), table);
    output.push(...expanded.map((h) => h.token));
  }
  return output;
};
