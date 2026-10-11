import { assert } from "chai";
import { describe, it } from "mocha";
import { preprocessSource, MacroTable, PreprocessorError } from "../src/preprocessor";

const texts = (src: string, table?: MacroTable): string[] =>
  preprocessSource(src, table).tokens.map((t) => t.text);

describe("conditional compilation (6.10.1)", () => {
  it("a header guard is idempotent when run twice through the same macro table", () => {
    const src = "#ifndef FOO_H\n#define FOO_H\nint x;\n#endif\n";
    const table = new MacroTable();
    assert.deepEqual(texts(src, table), ["int", "x", ";"]);
    // second pass: FOO_H is now defined, so the guarded body must not appear again.
    assert.deepEqual(texts(src, table), []);
  });

  it("evaluates a non-trivial arithmetic #if condition, not just a bare literal", () => {
    assert.deepEqual(texts("#if 1 + 1 == 2\nyes\n#endif"), ["yes"]);
    assert.deepEqual(texts("#if 1 + 1 == 3\nyes\n#endif"), []);
  });

  it("#ifdef takes the true branch only when the name is actually defined", () => {
    assert.deepEqual(texts("#define X\n#ifdef X\nyes\n#else\nno\n#endif"), ["yes"]);
    assert.deepEqual(texts("#ifdef X\nyes\n#else\nno\n#endif"), ["no"]);
  });

  it("#ifndef is the exact inverse of #ifdef", () => {
    assert.deepEqual(texts("#define X\n#ifndef X\nyes\n#else\nno\n#endif"), ["no"]);
    assert.deepEqual(texts("#ifndef X\nyes\n#else\nno\n#endif"), ["yes"]);
  });

  it("defined(X) and the parenthesis-free defined X both work inside #if", () => {
    assert.deepEqual(texts("#define X\n#if defined(X)\nyes\n#endif"), ["yes"]);
    assert.deepEqual(texts("#define X\n#if defined X\nyes\n#endif"), ["yes"]);
    assert.deepEqual(texts("#if defined(X)\nyes\n#endif"), []);
    assert.deepEqual(texts("#if defined X\nyes\n#endif"), []);
  });

  it("defined's operand is never macro-expanded, even if it names a macro itself", () => {
    // if X's own replacement list were substituted in before 'defined' saw it, this
    // would blow up trying to evaluate "defined 1 + 1" instead of "defined X".
    assert.deepEqual(texts("#define X 1 + 1\n#if defined(X)\nyes\n#endif"), ["yes"]);
  });

  it("#elif picks the first true branch among several, independent of #if", () => {
    const body = (n: number) =>
      `#if ${n} == 1\none\n#elif ${n} == 2\ntwo\n#elif ${n} == 3\nthree\n#else\nother\n#endif`;
    assert.deepEqual(texts(body(1)), ["one"]);
    assert.deepEqual(texts(body(2)), ["two"]);
    assert.deepEqual(texts(body(3)), ["three"]);
    assert.deepEqual(texts(body(4)), ["other"]);
  });

  it("nested #if selects the correct branch at each level independently", () => {
    const src =
      "#if 1\n" +
      "  #if 0\n" +
      "  inner-false\n" +
      "  #else\n" +
      "  inner-true\n" +
      "  #endif\n" +
      "#else\n" +
      "outer-false\n" +
      "#endif";
    assert.deepEqual(texts(src), ["inner", "-", "true"]);
  });

  it("a skipped branch tolerates content that would otherwise be a constraint violation", () => {
    // '#define' with no name at all would normally throw - but never even looked at here.
    const src = "#if 0\n#define\n#undef\n#bogus directive entirely\n)))(((\n#endif\nsurvived";
    assert.deepEqual(texts(src), ["survived"]);
  });

  it("a nested #if's own condition is never evaluated while already skipping", () => {
    // ')' alone is not a valid #if expression - if this were actually evaluated it
    // would throw. Only tolerated because the outer #if 0 is already skipping.
    assert.deepEqual(texts("#if 0\n#if )\nx\n#endif\n#endif\nsurvived"), ["survived"]);
  });

  it("a skipped branch's own #include is never resolved either", () => {
    const opts = {
      resolveLocalInclude: () => {
        throw new Error("should not be called - the #include is inside a skipped #if 0");
      },
    };
    assert.deepEqual(
      preprocessSource('#if 0\n#include "never.h"\n#endif\nrest', undefined, opts).tokens.map(
        (t) => t.text,
      ),
      ["rest"],
    );
  });

  it("#endif without a matching #if is rejected with a specific diagnostic", () => {
    assert.throws(() => preprocessSource("#endif"), PreprocessorError, /without a matching #if/);
  });

  it("an unterminated #if at end of file is rejected with a specific diagnostic", () => {
    assert.throws(() => preprocessSource("#if 1\nx"), PreprocessorError, /unterminated #if/);
  });

  it("#else after #else, and #elif after #else, are both rejected", () => {
    assert.throws(
      () => preprocessSource("#if 1\n#else\n#else\n#endif"),
      PreprocessorError,
      /after #else/,
    );
    assert.throws(
      () => preprocessSource("#if 1\n#else\n#elif 1\n#endif"),
      PreprocessorError,
      /after #else/,
    );
  });

  it("#elif/#else without any open #if are each rejected", () => {
    assert.throws(() => preprocessSource("#elif 1"), PreprocessorError, /without a matching #if/);
    assert.throws(() => preprocessSource("#else"), PreprocessorError, /without a matching #if/);
  });

  it("supports the full range of operators: bitwise, shift, relational, logical, ternary", () => {
    assert.deepEqual(texts("#if (1 << 3) == 8\nyes\n#endif"), ["yes"]);
    assert.deepEqual(texts("#if (6 & 3) == 2\nyes\n#endif"), ["yes"]);
    assert.deepEqual(texts("#if (6 | 1) == 7\nyes\n#endif"), ["yes"]);
    assert.deepEqual(texts("#if (5 ^ 1) == 4\nyes\n#endif"), ["yes"]);
    assert.deepEqual(texts("#if 1 && 0\nyes\n#else\nno\n#endif"), ["no"]);
    assert.deepEqual(texts("#if 0 || 1\nyes\n#else\nno\n#endif"), ["yes"]);
    assert.deepEqual(texts("#if (1 ? 10 : 20) == 10\nyes\n#endif"), ["yes"]);
    assert.deepEqual(texts("#if !0\nyes\n#endif"), ["yes"]);
    assert.deepEqual(texts("#if ~0 == -1\nyes\n#endif"), ["yes"]);
  });

  it("a macro used inside a #if condition is expanded before evaluation", () => {
    assert.deepEqual(texts("#define TWO 2\n#if TWO == 2\nyes\n#endif"), ["yes"]);
  });

  it("an undefined identifier left in a #if condition is treated as 0, not an error", () => {
    assert.deepEqual(texts("#if UNDEFINED_THING == 0\nyes\n#endif"), ["yes"]);
  });
});
