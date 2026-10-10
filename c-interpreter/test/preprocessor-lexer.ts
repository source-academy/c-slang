import { assert } from "chai";
import { describe, it } from "mocha";
import { lex, PPTokenKind, PreprocessorError } from "../src/preprocessor";

const texts = (src: string): string[] => lex(src).tokens.map((t) => t.text);
const kinds = (src: string): PPTokenKind[] => lex(src).tokens.map((t) => t.kind);

describe("preprocessing-token categories (6.4)", () => {
  it("tokenizes identifiers, including keywords as plain identifiers", () => {
    assert.deepEqual(texts("int foo _bar1"), ["int", "foo", "_bar1"]);
    assert.deepEqual(kinds("int foo"), [
      PPTokenKind.Identifier,
      PPTokenKind.Identifier,
    ]);
  });

  it("tokenizes ordinary integer and floating pp-numbers", () => {
    assert.deepEqual(texts("42 3.14 1e+5 0x1p0"), ["42", "3.14", "1e+5", "0x1p0"]);
  });

  it("tokenizes deliberately non-numeric pp-numbers as a single token each (6.4.8)", () => {
    // these are never valid C numbers, but pp-number's own grammar still has to
    // swallow them as one token - validity is a phase-7 question, not phase-3's.
    assert.deepEqual(texts("1..2"), ["1..2"]);
    assert.deepEqual(texts("08"), ["08"]);
    assert.deepEqual(texts("0x"), ["0x"]);
    assert.deepEqual(texts("3f"), ["3f"]);
  });

  it("a string literal with an escaped quote is one token, not split early", () => {
    const src = '"a\\"b"';
    const toks = lex(src).tokens;
    assert.equal(toks.length, 1);
    assert.equal(toks[0].kind, PPTokenKind.StringLiteral);
    assert.equal(toks[0].text, src);
  });

  it("a character constant with an escaped quote is one token", () => {
    const src = "'\\''";
    const toks = lex(src).tokens;
    assert.equal(toks.length, 1);
    assert.equal(toks[0].kind, PPTokenKind.CharacterConstant);
    assert.equal(toks[0].text, src);
  });

  it("matches the longest punctuator at each position (maximal munch)", () => {
    assert.deepEqual(texts("<<="), ["<<="]);
    assert.deepEqual(texts("<<"), ["<<"]);
    assert.deepEqual(texts("a<b"), ["a", "<", "b"]);
    assert.deepEqual(texts("##"), ["##"]);
  });

  it("falls back to a single-character catch-all for anything else", () => {
    assert.deepEqual(texts("@"), ["@"]);
    assert.deepEqual(kinds("@"), [PPTokenKind.Other]);
  });

  it("hasLeadingWhitespace reflects whether real whitespace/comments preceded a token", () => {
    const toks = lex("a b").tokens;
    assert.isFalse(toks[0].hasLeadingWhitespace);
    assert.isTrue(toks[1].hasLeadingWhitespace);
    const toks2 = lex("a+b").tokens;
    assert.isFalse(toks2[1].hasLeadingWhitespace);
  });
});

describe("header-name (6.4p4) - context-sensitive, only right after #include", () => {
  it("recognizes the angle-bracket form as one token", () => {
    const toks = lex("#include <stdio.h>").tokens;
    assert.deepEqual(toks.map((t) => t.kind), [
      PPTokenKind.Punctuator,
      PPTokenKind.Identifier,
      PPTokenKind.HeaderName,
    ]);
    assert.equal(toks[2].text, "<stdio.h>");
  });

  it("recognizes the quoted form as one token", () => {
    const toks = lex('#include "local.h"').tokens;
    assert.equal(toks[2].kind, PPTokenKind.HeaderName);
    assert.equal(toks[2].text, '"local.h"');
  });

  it("does not fire outside the #include position", () => {
    assert.deepEqual(kinds("a < b"), [
      PPTokenKind.Identifier,
      PPTokenKind.Punctuator,
      PPTokenKind.Identifier,
    ]);
  });

  it("does not leak into a later, unrelated < on its own line", () => {
    const toks = lex("#include <a.h>\nint x = 1 < 2;").tokens;
    const lt = toks.filter((t) => t.text === "<");
    assert.equal(lt.length, 1);
    assert.equal(lt[0].kind, PPTokenKind.Punctuator);
  });
});

describe("line splicing (5.1.1.2 phase 2)", () => {
  it("deletes a single backslash-newline, joining two physical lines into one", () => {
    assert.deepEqual(texts("foo\\\nbar"), ["foobar"]);
  });

  it("handles two consecutive backslash-newlines", () => {
    assert.deepEqual(texts("fo\\\no\\\nbar"), ["foobar"]);
  });

  it("handles three consecutive backslash-newlines", () => {
    assert.deepEqual(texts("a\\\nb\\\nc\\\nd"), ["abcd"]);
  });

  it("splices inside a string literal - deletion happens before tokenizing at all", () => {
    const toks = lex('"foo\\\nbar"').tokens;
    assert.equal(toks.length, 1);
    assert.equal(toks[0].kind, PPTokenKind.StringLiteral);
    assert.equal(toks[0].text, '"foobar"');
  });

  it("splices a line continuation inside a // comment onto the next physical line", () => {
    // without splicing this would only hide the rest of *this* line; splicing first
    // (phase 2, before // is even recognized as a comment introducer in phase 3)
    // means the comment swallows the next physical line too - a classic real gotcha.
    const toks = lex("foo(); // comment\\\nstill hidden\nbar();").tokens;
    assert.deepEqual(toks.map((t) => t.text), [
      "foo", "(", ")", ";", "bar", "(", ")", ";",
    ]);
  });
});

describe("comments are replaced by one space each (6.4.9p3)", () => {
  it("a block comment between two identifiers still separates them", () => {
    const toks = lex("foo/* comment */bar").tokens;
    assert.deepEqual(toks.map((t) => t.text), ["foo", "bar"]);
    assert.isTrue(toks[1].hasLeadingWhitespace);
  });

  it("a line comment consumes to end of line but not the newline itself", () => {
    const toks = lex("foo // comment\nbar").tokens;
    assert.deepEqual(
      toks.map((t) => [t.text, t.line]),
      [["foo", 1], ["bar", 2]],
    );
  });
});

describe("position mapping survives splicing", () => {
  it("a token after a spliced line still resolves to its correct original line", () => {
    const { tokens, map } = lex("a\\\nb\nc");
    const c = tokens.find((t) => t.text === "c");
    assert.exists(c);
    assert.equal(map.resolve(c!.start).line, 3);
  });

  it("a token's column is correct even after an earlier splice on the same physical line", () => {
    const { tokens, map } = lex("ab\\\ncd ef");
    const ef = tokens.find((t) => t.text === "ef");
    assert.exists(ef);
    const pos = map.resolve(ef!.start);
    assert.equal(pos.line, 2);
    assert.equal(pos.column, 4);
  });
});

describe("malformed input is rejected with a clear diagnostic", () => {
  it("an unterminated string literal throws", () => {
    assert.throws(() => lex('"unterminated'), PreprocessorError, /terminating/);
  });

  it("an unterminated character constant throws", () => {
    assert.throws(() => lex("'x"), PreprocessorError, /terminating/);
  });

  it("an unterminated block comment throws", () => {
    assert.throws(() => lex("/* never closed"), PreprocessorError, /comment/);
  });

  it("an unterminated header-name throws", () => {
    assert.throws(
      () => lex("#include <never closed"),
      PreprocessorError,
      /header name/,
    );
  });
});

describe("end-to-end: a small realistic snippet", () => {
  it("tokenizes a two-line program with a comment and a string literal correctly", () => {
    const src = 'int main() { // say hi\n  print("hi");\n  return 0;\n}\n';
    assert.deepEqual(texts(src), [
      "int", "main", "(", ")", "{",
      "print", "(", '"hi"', ")", ";",
      "return", "0", ";",
      "}",
    ]);
  });
});
