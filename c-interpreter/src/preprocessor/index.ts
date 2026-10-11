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

/**
 * Phases 1-4 end to end: lex, then recognize directives and expand macros against
 * `table` (reused across calls if passed in, so #define/#undef state persists the
 * way it would across a real multi-line program). `includedFiles` records what a
 * successfully-resolved #include actually pulled in, each with its own tokens and
 * position map.
 */
export const preprocessSource = (
  source: string,
  table: MacroTable = new MacroTable(),
  opts: PreprocessorOptions = {},
): { tokens: PPToken[]; table: MacroTable; includedFiles: IncludedFile[] } => {
  const { tokens, map } = lex(source, opts.fileName ?? null);
  const includedFiles: IncludedFile[] = [];
  const result = preprocessTokens(tokens, table, map, opts, includedFiles);
  return { tokens: result, table, includedFiles };
};
