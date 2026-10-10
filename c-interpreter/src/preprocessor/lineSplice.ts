import { PositionMap } from "./position";

export interface SplicedSource {
  text: string;
  map: PositionMap;
}

/**
 * (5.1.1.2 phase 2) Each backslash immediately followed by a new-line is deleted,
 * splicing physical source lines into logical ones. Runs as a true first pass over the
 * raw text, before any tokenizing - a spliced string literal or comment is spliced
 * exactly the same as anywhere else, since phase 2 has no notion of tokens yet.
 */
export const spliceLines = (
  source: string,
  file: string | null = null,
): SplicedSource => {
  let text = "";
  const logicalToOriginal: number[] = [];
  let i = 0;
  while (i < source.length) {
    if (
      source[i] === "\\" &&
      (source[i + 1] === "\n" ||
        (source[i + 1] === "\r" && source[i + 2] === "\n"))
    ) {
      i += source[i + 1] === "\r" ? 3 : 2;
      continue;
    }
    text += source[i];
    logicalToOriginal.push(i);
    i++;
  }
  logicalToOriginal.push(i); // one past the last real character
  return { text, map: new PositionMap(source, logicalToOriginal, file) };
};
