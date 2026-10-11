import { assert } from "chai";
import { describe, it } from "mocha";
import { preprocessSource, PreprocessorError, PreprocessorOptions } from "../src/preprocessor";

const texts = (src: string, opts?: PreprocessorOptions): string[] =>
  preprocessSource(src, undefined, opts).tokens.map((t) => t.text);

describe("predefined macros, #error, #pragma, #line (6.10.4 / 6.10.5 / 6.10.8 / 6.10.9)", () => {
  it("__LINE__ reports the real current line, tracking through blank/spliced/directive lines", () => {
    const src = [
      "#define X 1", // line 1
      "", // line 2
      "a \\", // line 3, spliced onto line 4
      "b", // line 4
      "", // line 5
      "__LINE__", // line 6
    ].join("\n");
    assert.deepEqual(texts(src), ["a", "b", "6"]);
  });

  it("__FILE__ expands to the preprocessor's configured source name", () => {
    assert.deepEqual(texts("__FILE__", { fileName: "test.c" }), ['"test.c"']);
  });

  it("__STDC__ and __STDC_VERSION__ match this project's C17 target", () => {
    assert.deepEqual(texts("__STDC__"), ["1"]);
    assert.deepEqual(texts("__STDC_VERSION__"), ["201710L"]);
  });

  it("__DATE__ and __TIME__ expand to plausibly-shaped string literals", () => {
    const [dateTok, timeTok] = texts("__DATE__\n__TIME__");
    assert.match(dateTok, /^"[A-Za-z]{3} [ 0-9][0-9] [0-9]{4}"$/);
    assert.match(timeTok, /^"[0-9]{2}:[0-9]{2}:[0-9]{2}"$/);
  });

  it("#error surfaces its exact message text, quoted or bare", () => {
    assert.throws(() => preprocessSource('#error "custom message"'), PreprocessorError, /custom message/);
    assert.throws(() => preprocessSource("#error this is broken"), PreprocessorError, /this is broken/);
  });

  it("#pragma is an unconditional no-op, for recognized and made-up pragmas alike", () => {
    assert.deepEqual(texts("#pragma once\n#pragma something-else-entirely\nsurvived"), ["survived"]);
  });

  it("_Pragma(...) is likewise an unconditional no-op, wherever it appears in the token stream", () => {
    assert.deepEqual(texts('before _Pragma("once") after'), ["before", "after"]);
  });

  it("_Pragma with a non-string-literal argument is rejected", () => {
    assert.throws(() => preprocessSource("_Pragma(42)"), PreprocessorError, /string literal/);
  });

  it("#line resets the presumed line number starting on the next physical line", () => {
    assert.deepEqual(texts("#line 100\n__LINE__"), ["100"]);
    assert.deepEqual(texts("#line 100\na\n__LINE__"), ["a", "101"]);
  });

  it("#line's optional filename overrides __FILE__, and carries forward across a later #line that omits it", () => {
    const src = ['#line 10 "a.c"', "__FILE__", "__LINE__", "#line 20", "__FILE__", "__LINE__"].join(
      "\n",
    );
    assert.deepEqual(texts(src), ['"a.c"', "11", '"a.c"', "21"]);
  });

  it("defined()/#ifdef treat predefined macros as defined, without actually storing them", () => {
    assert.deepEqual(texts("#ifdef __STDC__\nyes\n#else\nno\n#endif"), ["yes"]);
    assert.deepEqual(texts("#ifdef __NOT_A_REAL_PREDEFINED_NAME__\nyes\n#else\nno\n#endif"), ["no"]);
  });

  it("#line also shifts the line a later PreprocessorError reports, not just __LINE__", () => {
    assert.throws(() => preprocessSource("#line 100\n#define"), PreprocessorError, /^line 100 /);
  });
});
