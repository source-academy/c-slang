export * from "./position";
export * from "./errors";
export * from "./ppLexer";
export * from "./macroTable";
export * from "./directives";
export { spliceLines } from "./lineSplice";

import { spliceLines } from "./lineSplice";
import { tokenize, PPToken } from "./ppLexer";
import { PositionMap } from "./position";
import { MacroTable } from "./macroTable";
import { preprocessTokens } from "./directives";

export interface LexResult {
  tokens: PPToken[];
  map: PositionMap;
  text: string;
}

/** Phases 1-3: splice backslash-newlines, then tokenize into preprocessing tokens. */
export const lex = (source: string, file: string | null = null): LexResult => {
  const { text, map } = spliceLines(source, file);
  const tokens = tokenize(text, map);
  return { tokens, map, text };
};

/**
 * Phases 1-4 end to end: lex, then recognize directives and expand macros against
 * `table` (reused across calls if passed in, so #define/#undef state persists the
 * way it would across a real multi-line program).
 */
export const preprocessSource = (
  source: string,
  table: MacroTable = new MacroTable(),
): { tokens: PPToken[]; table: MacroTable } => {
  const { tokens, map } = lex(source);
  const result = preprocessTokens(tokens, table, map);
  return { tokens: result, table };
};
