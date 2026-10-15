export * from "./position";
export * from "./errors";
export * from "./ppLexer";
export * from "./macroTable";
export * from "./context";
export * from "./conditionalExpr";
export * from "./directives";
export * from "./lex";
export { spliceLines } from "./lineSplice";

import { PPToken } from "./ppLexer";
import { MacroTable } from "./macroTable";
import { IncludedFile, PreprocessorOptions, preprocessTokens } from "./directives";
import { lex } from "./lex";
import { PositionMap } from "./position";

/**
 * Phases 1-4 end to end: lex, then recognize directives and expand macros against
 * `table` (reused across calls if passed in, so #define/#undef state persists the
 * way it would across a real multi-line program). `includedFiles` records what a
 * successfully-resolved #include actually pulled in, each with its own tokens and
 * position map. `map` is the top-level source's own map - the one every output
 * token's `start` is already meaningful against (see A7.3: an #include's content is
 * spliced in fully preprocessed, not as raw tokens tagged with their own file).
 */
export const preprocessSource = (
  source: string,
  table: MacroTable = new MacroTable(),
  opts: PreprocessorOptions = {},
): {
  tokens: PPToken[];
  table: MacroTable;
  includedFiles: IncludedFile[];
  map: PositionMap;
  rawTokens: PPToken[];
  text: string;
} => {
  const { tokens: rawTokens, map, text } = lex(source, opts.fileName ?? null);
  const includedFiles: IncludedFile[] = [];
  const result = preprocessTokens(rawTokens, table, map, opts, includedFiles);
  return { tokens: result, table, includedFiles, map, rawTokens, text };
};

// cparser.pegjs isn't actually whitespace-insensitive everywhere a naive reading of
// "C doesn't care about whitespace between tokens" would suggest - COLON, in
// particular, never skips *leading* whitespace of its own (`CASE a:MINUS? b:
// IntegerConstant COLON` has no `_` between the constant and the colon), so inserting
// a space nothing in real student source ever had (e.g. "case 1:" written with no
// space at all) can turn previously-valid code into a parse error. The safe rule is
// therefore "preserve the original adjacency (via hasLeadingWhitespace), except where
// doing so would risk two tokens merging into a different one" - which only ever
// happens at a word-character/word-character boundary (two identifiers, a number
// running into an identifier or another number, etc.), never at a punctuator.
const isWordChar = (c: string | undefined): boolean => c !== undefined && /[A-Za-z0-9_.]/.test(c);

const needsSeparator = (prev: PPToken, cur: PPToken): boolean =>
  cur.hasLeadingWhitespace || (isWordChar(prev.text[prev.text.length - 1]) && isWordChar(cur.text[0]));

// A program using no directives and invoking no macros produces an output token
// stream that's just `rawTokens` again, unchanged - in that case the reconstruction
// below isn't needed at all, and must be skipped: something outside this interpreter
// entirely (c-viz-frontend's hover-to-highlight, which indexes straight into the
// student's own editor buffer using an AST node's offsets) depends on parseProgram's
// AST carrying *exact* original-source offsets whenever nothing actually needed
// preprocessing - not just a plausible reconstruction of them.
const isUnchanged = (tokens: readonly PPToken[], rawTokens: readonly PPToken[]): boolean =>
  tokens.length === rawTokens.length && tokens.every((t, i) => t.start === rawTokens[i].start);

/**
 * Turns a finished token stream back into readable text a student could be shown
 * (A7's own stated architecture goal), plus a map resolving an offset *in that text*
 * all the way back to the original source. When nothing was actually preprocessed,
 * hands back `splicedText` (already correctly mapped by `map`, including through any
 * backslash-newline splicing) untouched, rather than reconstructing it from tokens -
 * preserving exact offsets for the overwhelmingly common case. Only a program that
 * actually uses directives or invokes a macro falls through to reconstruction, where
 * a token substituted from inside a macro's replacement list carries that macro's
 * #define-time line (a known, documented limit - see weekly-log.md's A7.5 entry), so
 * tokens are grouped by their own line number clamped to never go backwards, rather
 * than by a strict "new line on every line change" rule that would otherwise scatter
 * macro-expanded content out of order.
 */
export const renderText = (
  tokens: readonly PPToken[],
  rawTokens: readonly PPToken[],
  splicedText: string,
  map: PositionMap,
): { text: string; map: PositionMap } => {
  if (isUnchanged(tokens, rawTokens)) return { text: splicedText, map };

  const parts: string[] = [];
  const toLogical: number[] = [];
  let currentLine = -Infinity;
  let lastStart = 0;

  tokens.forEach((t, i) => {
    const line = Math.max(t.line, currentLine);
    const lineChanged = i > 0 && line !== currentLine;
    if (i > 0) {
      const sep = lineChanged ? "\n" : needsSeparator(tokens[i - 1], t) ? " " : "";
      if (sep !== "") {
        parts.push(sep);
        toLogical.push(lastStart);
      }
    }
    currentLine = line;
    parts.push(t.text);
    for (let k = 0; k < t.text.length; k++) toLogical.push(t.start);
    lastStart = t.start;
  });
  toLogical.push(lastStart); // trailing entry, matching PositionMap's own convention

  return { text: parts.join(""), map: new PositionMap("", [], null, { toLogical, inner: map }) };
};
