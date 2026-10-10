import { assert } from "chai";
import { describe, it } from "mocha";
import { preprocessSource, PreprocessorError, PreprocessorOptions } from "../src/preprocessor";

const texts = (src: string, opts?: PreprocessorOptions): string[] =>
  preprocessSource(src, undefined, opts).tokens.map((t) => t.text);

describe("#include (6.10.2)", () => {
  it("a system (angle-bracket) include contributes nothing and does not error", () => {
    assert.deepEqual(texts("#include <stdio.h>\nint x;"), ["int", "x", ";"]);
  });

  it("works the same for other plausible system header names", () => {
    for (const header of ["<stdlib.h>", "<string.h>", "<math.h>"]) {
      assert.deepEqual(texts(`#include ${header}\n1`), ["1"]);
    }
  });

  it("never invokes the resolver for the angle-bracket form - it's a no-op by definition", () => {
    const opts: PreprocessorOptions = {
      resolveLocalInclude: () => {
        throw new Error("should not be called for <...> includes");
      },
    };
    assert.deepEqual(texts("#include <stdio.h>\n1", opts), ["1"]);
  });

  it("a quoted include with no resolver supplied throws a specific, clear error", () => {
    assert.throws(
      () => preprocessSource('#include "local.h"'),
      PreprocessorError,
      /multi-file support/,
    );
  });

  it("#include with a macro-expanded name is rejected with its own distinct message", () => {
    assert.throws(
      () => preprocessSource("#define HEADER <stdio.h>\n#include HEADER"),
      PreprocessorError,
      /macro-expanded/,
    );
  });

  it("a quoted include with a resolver splices the resolved content in, fully preprocessed", () => {
    const result = preprocessSource('#include "local.h"\nBAR', undefined, {
      resolveLocalInclude: (name) => (name === "local.h" ? "#define BAR 99\n" : null),
    });
    assert.deepEqual(result.tokens.map((t) => t.text), ["99"]);
  });

  it("exposes the included file's own tokens and position map via includedFiles", () => {
    const result = preprocessSource('#include "local.h"\nrest', undefined, {
      resolveLocalInclude: (name) => (name === "local.h" ? "first\nsecond" : null),
    });
    assert.equal(result.includedFiles.length, 1);
    const inc = result.includedFiles[0];
    assert.equal(inc.name, "local.h");
    const second = inc.tokens.find((t) => t.text === "second");
    assert.exists(second);
    // line 2 of local.h's *own* text - not the includer's line 2, which is "rest".
    assert.equal(inc.map.resolve(second!.start).line, 2);
  });

  it("a macro defined before #include is visible inside the included content", () => {
    const result = preprocessSource('#define X 7\n#include "inc.h"', undefined, {
      resolveLocalInclude: (name) => (name === "inc.h" ? "X" : null),
    });
    assert.deepEqual(result.tokens.map((t) => t.text), ["7"]);
  });

  it("a macro the included file defines remains visible afterward in the includer", () => {
    const result = preprocessSource('#include "inc.h"\nY', undefined, {
      resolveLocalInclude: (name) => (name === "inc.h" ? "#define Y 5\n" : null),
    });
    assert.deepEqual(result.tokens.map((t) => t.text), ["5"]);
  });

  it("an included file's own #include is resolved recursively through the same mechanism", () => {
    const result = preprocessSource('#include "a.h"', undefined, {
      resolveLocalInclude: (name) => {
        if (name === "a.h") return '#include "b.h"\n';
        if (name === "b.h") return "deep";
        return null;
      },
    });
    assert.deepEqual(result.tokens.map((t) => t.text), ["deep"]);
    assert.equal(result.includedFiles.length, 2);
  });
});
