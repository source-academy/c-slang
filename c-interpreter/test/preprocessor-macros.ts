import { assert } from "chai";
import { describe, it } from "mocha";
import {
  preprocessSource,
  MacroTable,
  PreprocessorError,
} from "../src/preprocessor";

const texts = (src: string): string[] =>
  preprocessSource(src).tokens.map((t) => t.text);

describe("macro definition and expansion (6.10.3)", () => {
  it("expands a basic object-like macro", () => {
    assert.deepEqual(texts("#define FOO 42\nFOO"), ["42"]);
  });

  it("expands a function-like macro with multiple parameters", () => {
    assert.deepEqual(
      texts("#define ADD(a, b) a + b\nADD(1, 2)"),
      ["1", "+", "2"],
    );
  });

  it("a function-like macro name used without a following '(' is left unexpanded", () => {
    assert.deepEqual(texts("#define ADD(a, b) a + b\nADD;"), ["ADD", ";"]);
  });

  it("direct self-reference does not infinite-loop - the blue paint rule", () => {
    assert.deepEqual(texts("#define X X\nX"), ["X"]);
  });

  it("mutual recursion through macro arguments needs intersection, not union, of hide sets", () => {
    // the classic f/g example: expanding g's call site must NOT inherit f's own
    // hide set wholesale, or f would be wrongly painted the moment g substitutes
    // "f(a)" back in, and the whole expansion would stop one step too early.
    // Correct result: 2*9*g (g is painted on its *own* second, inner appearance).
    const src = "#define f(a) a*g\n#define g(a) f(a)\nf(2)(9)";
    assert.deepEqual(texts(src), ["2", "*", "9", "*", "g"]);
  });

  it("stringizes a simple argument, collapsing internal whitespace to one space", () => {
    assert.deepEqual(
      texts('#define STR(x) #x\nSTR(hello   world)'),
      ['"hello world"'],
    );
  });

  it("stringizing an argument that is itself a string literal escapes its quotes and backslashes", () => {
    const toks = preprocessSource('#define STR(x) #x\nSTR("hi")').tokens;
    assert.equal(toks.length, 1);
    assert.equal(toks[0].text, '"\\"hi\\""');
  });

  it("token-pastes two identifier halves into one new identifier", () => {
    const toks = preprocessSource("#define CAT(a, b) a##b\nCAT(foo, bar)").tokens;
    assert.deepEqual(toks.map((t) => t.text), ["foobar"]);
    assert.equal(toks.length, 1);
  });

  it("an invalid token-paste is rejected, not silently concatenated as text", () => {
    assert.throws(
      () => preprocessSource("#define CAT(a, b) a##b\nCAT(1, +)"),
      PreprocessorError,
      /invalid preprocessing token/,
    );
  });

  it("pasting with an empty argument is a no-op, not an error", () => {
    assert.deepEqual(
      texts("#define CAT(a, b) a##b\nCAT(foo,)"),
      ["foo"],
    );
  });

  it("a variadic macro collects extra arguments into __VA_ARGS__, commas included", () => {
    assert.deepEqual(
      texts('#define LOG(fmt, ...) fmt __VA_ARGS__\nLOG("x", 1, 2)'),
      ['"x"', "1", ",", "2"],
    );
  });

  it("a variadic macro accepts zero extra arguments - __VA_ARGS__ is simply empty", () => {
    assert.deepEqual(texts('#define LOG(fmt, ...) fmt __VA_ARGS__\nLOG("x")'), ['"x"']);
  });

  it("#undef then re-#define with a different body is allowed", () => {
    assert.deepEqual(
      texts("#define FOO 1\n#undef FOO\n#define FOO 2\nFOO"),
      ["2"],
    );
  });

  it("re-#define with an identical body is allowed silently", () => {
    assert.deepEqual(texts("#define FOO 1\n#define FOO 1\nFOO"), ["1"]);
  });

  it("re-#define with a conflicting body, without #undef first, is rejected", () => {
    assert.throws(
      () => preprocessSource("#define FOO 1\n#define FOO 2\nFOO"),
      PreprocessorError,
      /redefinition/,
    );
  });

  it("#undef actually stops further expansion - a later use is left as a plain identifier", () => {
    const table = new MacroTable();
    const first = preprocessSource("#define FOO 1\nFOO", table);
    assert.deepEqual(first.tokens.map((t) => t.text), ["1"]);
    assert.isTrue(table.isDefined("FOO"));

    const second = preprocessSource("#undef FOO\nFOO", table);
    assert.deepEqual(second.tokens.map((t) => t.text), ["FOO"]);
    assert.isFalse(table.isDefined("FOO"));
  });

  it("invoking a non-variadic macro with the wrong argument count is rejected", () => {
    assert.throws(
      () => preprocessSource("#define ADD(a, b) a + b\nADD(1)"),
      PreprocessorError,
      /argument/,
    );
  });

  it("a zero-parameter macro invoked with empty parentheses takes zero arguments, not one empty one", () => {
    assert.deepEqual(texts("#define FOO() 1\nFOO()"), ["1"]);
  });

  it("'##' at the start or end of a replacement list is rejected at #define time", () => {
    assert.throws(
      () => preprocessSource("#define BAD(a) ##a"),
      PreprocessorError,
      /##/,
    );
    assert.throws(
      () => preprocessSource("#define BAD(a) a##"),
      PreprocessorError,
      /##/,
    );
  });

  it("'#' not followed by a parameter in a function-like macro is rejected at #define time", () => {
    assert.throws(
      () => preprocessSource("#define BAD(a) # 1"),
      PreprocessorError,
      /'#'/,
    );
  });

  it("macro expansion composes correctly when one macro's expansion opens a call to another", () => {
    // BAR expands to the literal text "FOO (" - the "(" only exists because of BAR's
    // own substitution, confirming rescanning treats freshly-substituted tokens
    // exactly like source tokens for the purpose of starting a new macro invocation.
    assert.deepEqual(
      texts("#define FOO(x) x+1\n#define BAR FOO(\nBAR 5)"),
      ["5", "+", "1"],
    );
  });
});
