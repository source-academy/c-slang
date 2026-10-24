import { assert } from "chai";
import { describe, it } from "mocha";
import cviz from "../src/index";
import { preprocessSource } from "../src/preprocessor";
import { Endianness } from "../src/config";

const reject = (source: string, name: string, reason: string, endianness: Endianness, watch = false) => {
  const rt = cviz.run("#include <string.h>\n" + source, { endianness });
  let before: { address: number; bytes: number[]; mask: boolean[] } | undefined;
  assert.throws(() => {
    for (let steps = 0; steps < 20000 && rt.exitCode === undefined; steps++) {
      if (watch) {
        const address = rt.symbolTable.getFileScope().dest;
        const range = address === undefined ? undefined : rt.memory.storage.find(BigInt(address), BigInt(1));
        if (range) before = {
          address, bytes: rt.memory.getBytes(address, range.size),
          mask: rt.initTable.getMask(address, range.size),
        };
      }
      rt.next();
    }
  }, new RegExp(name + ": .*" + reason));
  if (watch) {
    assert.exists(before);
    const { address, bytes, mask } = before!;
    assert.deepEqual(rt.memory.getBytes(address, bytes.length), bytes);
    assert.deepEqual(rt.initTable.getMask(address, bytes.length), mask);
  }
};

const rejectionGroup = (name: string, group: string, cases: readonly (readonly [string, string])[], watch = false) => {
  describe(`b1-string ${name}: ${group}`, () => {
    for (const endianness of ["little", "big"] as const)
      cases.forEach(([source, reason], index) => {
        it(`${index + 1}: ${reason} (${endianness})`, () => reject(source, name, reason, endianness, watch));
      });
  });
};

rejectionGroup("strlen", "invalid arguments", [
  ["int main() { strlen(NULL); return 0; }", "null pointer"],
  ["int main() { strlen((char *)1); return 0; }", "invalid storage"],
  ["int main() { char *p = malloc(2); free(p); strlen(p); return 0; }", "invalid storage"],
  ['int main() { char a[2] = "x"; strlen(a + 2); return 0; }', "invalid storage"],
]);
rejectionGroup("strlen", "missing terminators", [
  ["int main() { char a[2] = {'a', 'b'}; strlen(a); return 0; }", "missing terminator"],
  ["int main() { char *p = malloc(2); p[0] = 'a'; p[1] = 'b'; strlen(p); return 0; }", "missing terminator"],
]);
rejectionGroup("strcmp", "invalid arguments", [
  ['int main() { strcmp(NULL, "a"); return 0; }', "null pointer"],
  ['int main() { strcmp("a", NULL); return 0; }', "null pointer"],
  ['int main() { strcmp((char *)1, "a"); return 0; }', "invalid storage"],
  ['int main() { strcmp("a", (char *)1); return 0; }', "invalid storage"],
  ['int main() { char *p = malloc(2); free(p); strcmp(p, "a"); return 0; }', "invalid storage"],
]);
rejectionGroup("strcmp", "missing terminators", [
  ["int main() { char a[2] = {'a', 'b'}; strcmp(a, a); return 0; }", "missing terminator"],
  ['int main() { char a[2] = {\'a\', \'b\'}; strcmp("abc", a); return 0; }', "missing terminator"],
]);

describe("b1-string headers and declarations", () => {
  for (const [source, reason] of [
    ['int main() { return strlen("hi"); }', /identifier strlen not declared/],
    ['int strlen(const char *s); int main() { return 0; }', /conflicting types.*strlen/],
    ['unsigned int strlen(const char *s) { return 0; } int main() { return 0; }', /redefinition of native function.*strlen/],
    ['#include <string.h>\nint main() { return strlen(); }', /number of arguments/],
  ] as const) {
    it(source, () => assert.throws(() => cviz.run(source), reason));
  }
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
