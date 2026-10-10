import { PPToken, PPTokenKind } from "./ppLexer";
import { PreprocessorError } from "./errors";
import { PositionMap, SourcePosition } from "./position";
import { MacroDefinition, MacroTable, validateReplacementList } from "./macroTable";
import { expand, withFreshHideSets } from "./expand";

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

/**
 * Recognizes and applies one directive line. Only #define/#undef are handled
 * here (A7.2's own scope); any other directive name throws a clear "not yet
 * implemented" error rather than being silently mishandled - A7.3/A7.4 extend
 * this same dispatch with #include/#if and friends.
 */
export const processDirective = (
  line: readonly PPToken[],
  table: MacroTable,
  map: PositionMap,
): void => {
  if (line.length === 1) return; // (6.10p7) a lone '#' on its own line has no effect
  const directiveNameTok = line[1];
  const pos = posOf(directiveNameTok, map);
  if (directiveNameTok.kind !== PPTokenKind.Identifier)
    throw new PreprocessorError(pos, "invalid preprocessing directive");

  const rest = line.slice(2);
  switch (directiveNameTok.text) {
    case "define": {
      table.define(parseDefine(rest, pos), pos);
      return;
    }
    case "undef": {
      table.undef(parseUndef(rest, pos));
      return;
    }
    default:
      throw new PreprocessorError(
        pos,
        "preprocessing directive #" + directiveNameTok.text + " is not yet implemented",
      );
  }
};

/**
 * Walks the whole token stream once, left to right: a directive line updates
 * `table` and contributes nothing to the output; everything else is gathered into
 * one contiguous run (up to the next directive line, or end of input) and handed
 * to `expand()` together, since a function-like macro's arguments can legally
 * span several physical lines.
 */
export const preprocessTokens = (
  tokens: readonly PPToken[],
  table: MacroTable,
  map: PositionMap,
): PPToken[] => {
  const lines = groupIntoLines(tokens);
  const output: PPToken[] = [];
  let i = 0;
  while (i < lines.length) {
    if (isDirectiveLine(lines[i])) {
      processDirective(lines[i], table, map);
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
