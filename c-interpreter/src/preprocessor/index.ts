export * from "./position";
export * from "./errors";
export * from "./ppLexer";
export { spliceLines } from "./lineSplice";

import { spliceLines } from "./lineSplice";
import { tokenize, PPToken } from "./ppLexer";
import { PositionMap } from "./position";

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
