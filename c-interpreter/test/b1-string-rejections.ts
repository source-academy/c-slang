import { assert } from "chai";
import { describe, it } from "mocha";
import cviz from "../src/index";
import { preprocessSource } from "../src/preprocessor";

describe("b1-string headers and declarations", () => {
  it("maps embedded declarations and macro replacements to the include site", () => {
    const source = "#include <string.h>\nNULL";
    const result = preprocessSource(source);
    for (const token of result.tokens) {
      assert.equal(token.start, source.indexOf("<"));
      assert.equal(token.line, 1);
    }
  });
  it("keeps user diagnostic positions after an embedded include", () => {
    assert.throws(
      () => cviz.run("#include <string.h>\n\nint main() {\n  return missing;\n}"),
      /line 4 .*identifier missing not declared/,
    );
  });

  it("keeps typedefs and macros local to one preprocessing/run context", () => {
    cviz.run("#include <string.h>\nint main() { return 0; }");
    assert.throws(() => cviz.run("int main() { size_t x; return 0; }"));
    assert.equal(cviz.preprocess("NULL").text, "NULL");
  });

  it("prefers the quoted local resolver to the embedded header", () => {
    const result = preprocessSource('#include "string.h"\nLOCAL', undefined, {
      resolveLocalInclude: () => "#define LOCAL 42\n",
    });
    assert.deepEqual(result.tokens.map(t => t.text), ["42"]);
  });
});
