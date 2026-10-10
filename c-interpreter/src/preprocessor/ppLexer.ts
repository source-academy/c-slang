import { PreprocessorError } from "./errors";
import { PositionMap } from "./position";

// (6.4) preprocessing-token categories. Note this is a *different* grammar from the
// main parser's `Token` rule in cparser.pegjs - see a7-plan.md's A7.1 section for why
// it can't be reused: pp-number is deliberately looser than a real numeric constant,
// header-name is context-sensitive, and keywords aren't a category here at all.
export enum PPTokenKind {
  HeaderName = "header-name",
  Identifier = "identifier",
  PPNumber = "pp-number",
  CharacterConstant = "character-constant",
  StringLiteral = "string-literal",
  Punctuator = "punctuator",
  Other = "other",
}

export interface PPToken {
  kind: PPTokenKind;
  text: string;
  start: number; // offset into the logical (post-splicing) text
  end: number; // exclusive
  line: number; // 1-based logical line number, within the logical text
  hasLeadingWhitespace: boolean;
}

// (6.4.6) punctuator set, including #/## which only ever mean anything to the
// preprocessor. Sorted longest-first so a greedy scan implements maximal munch.
const PUNCTUATORS = [
  "%:%:",
  "<<=",
  ">>=",
  "...",
  "->",
  "++",
  "--",
  "<<",
  ">>",
  "<=",
  ">=",
  "==",
  "!=",
  "&&",
  "||",
  "*=",
  "/=",
  "%=",
  "+=",
  "-=",
  "&=",
  "^=",
  "|=",
  "##",
  "<:",
  ":>",
  "<%",
  "%>",
  "%:",
  "[",
  "]",
  "(",
  ")",
  "{",
  "}",
  ".",
  "&",
  "*",
  "+",
  "-",
  "~",
  "!",
  "/",
  "%",
  "<",
  ">",
  "^",
  "|",
  "?",
  ":",
  ";",
  "=",
  ",",
  "#",
].sort((a, b) => b.length - a.length);

const isDigit = (c: string): boolean => c >= "0" && c <= "9";
const isIdentifierStart = (c: string): boolean => /[A-Za-z_]/.test(c);
const isIdentifierPart = (c: string): boolean => /[A-Za-z0-9_]/.test(c);

/**
 * Phase 3: decomposes already-spliced source text into preprocessing tokens. `map` is
 * used only to translate a position into the student's original source when something
 * malformed is found - tokens themselves carry logical-text offsets, resolved on demand.
 */
export const tokenize = (text: string, map: PositionMap): PPToken[] => {
  const tokens: PPToken[] = [];
  let i = 0;
  let line = 1;
  // tokens seen so far on the *current* logical line - needed for the one genuinely
  // context-sensitive lexical rule in all of C: header-name is only ever tried
  // immediately after a line-initial `#` followed by the identifier `include` (6.4p4).
  let lineTokens: PPToken[] = [];

  const errorAt = (offset: number, message: string): never => {
    throw new PreprocessorError(map.resolve(offset), message);
  };

  const atIncludeHeaderPosition = (): boolean =>
    lineTokens.length === 2 &&
    lineTokens[0].kind === PPTokenKind.Punctuator &&
    lineTokens[0].text === "#" &&
    lineTokens[1].kind === PPTokenKind.Identifier &&
    lineTokens[1].text === "include";

  while (i < text.length) {
    let hadWhitespace = false;

    // whitespace and comments are never tokens themselves (6.4p1); a comment becomes
    // one space (6.4.9p3); a real newline starts a fresh logical line.
    for (;;) {
      if (i >= text.length) break;
      const c = text[i];
      if (c === "\n") {
        i++;
        line++;
        lineTokens = [];
        hadWhitespace = true;
        continue;
      }
      if (c === " " || c === "\t" || c === "\r" || c === "\v" || c === "\f") {
        i++;
        hadWhitespace = true;
        continue;
      }
      if (c === "/" && text[i + 1] === "/") {
        while (i < text.length && text[i] !== "\n") i++;
        hadWhitespace = true;
        continue;
      }
      if (c === "/" && text[i + 1] === "*") {
        const start = i;
        i += 2;
        while (i < text.length && !(text[i] === "*" && text[i + 1] === "/")) {
          if (text[i] === "\n") {
            line++;
            lineTokens = [];
          }
          i++;
        }
        if (i >= text.length) errorAt(start, "unterminated comment");
        i += 2;
        hadWhitespace = true;
        continue;
      }
      break;
    }
    if (i >= text.length) break;

    const start = i;
    let kind: PPTokenKind;

    if ((text[i] === "<" || text[i] === '"') && atIncludeHeaderPosition()) {
      const closer = text[i] === "<" ? ">" : '"';
      i++;
      while (i < text.length && text[i] !== closer && text[i] !== "\n") i++;
      if (i >= text.length || text[i] === "\n")
        errorAt(start, "missing terminating character for header name");
      i++;
      kind = PPTokenKind.HeaderName;
    } else if (text[i] === '"' || text[i] === "'") {
      const quote = text[i];
      kind =
        quote === '"' ? PPTokenKind.StringLiteral : PPTokenKind.CharacterConstant;
      i++;
      while (i < text.length && text[i] !== quote) {
        if (text[i] === "\n")
          errorAt(
            start,
            "missing terminating " + (quote === '"' ? '"' : "'") + " character",
          );
        if (text[i] === "\\" && i + 1 < text.length) i++;
        i++;
      }
      if (i >= text.length)
        errorAt(
          start,
          "missing terminating " + (quote === '"' ? '"' : "'") + " character",
        );
      i++;
    } else if (isDigit(text[i]) || (text[i] === "." && isDigit(text[i + 1]))) {
      // (6.4.8) pp-number - deliberately looser than a real numeric constant; see
      // a7-plan.md and the test suite for why this has to swallow things like "1..2".
      kind = PPTokenKind.PPNumber;
      i++;
      for (;;) {
        if (i >= text.length) break;
        const c = text[i];
        if (
          (c === "e" || c === "E" || c === "p" || c === "P") &&
          i + 1 < text.length &&
          (text[i + 1] === "+" || text[i + 1] === "-")
        ) {
          i += 2;
          continue;
        }
        if (isIdentifierPart(c) || c === ".") {
          i++;
          continue;
        }
        break;
      }
    } else if (isIdentifierStart(text[i])) {
      kind = PPTokenKind.Identifier;
      i++;
      while (i < text.length && isIdentifierPart(text[i])) i++;
    } else {
      const punct = PUNCTUATORS.find((p) => text.startsWith(p, i));
      if (punct !== undefined) {
        kind = PPTokenKind.Punctuator;
        i += punct.length;
      } else {
        kind = PPTokenKind.Other;
        i++;
      }
    }

    const token: PPToken = {
      kind,
      text: text.slice(start, i),
      start,
      end: i,
      line,
      hasLeadingWhitespace: hadWhitespace,
    };
    tokens.push(token);
    lineTokens.push(token);
  }

  return tokens;
};
