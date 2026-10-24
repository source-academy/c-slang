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
  }, new RegExp((name ? name + ": .*" : "") + reason));
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

rejectionGroup("memset", "invalid destinations", [
  ['char dest[4] = "abc"; int main() { memset(NULL, 0, 1); return 0; }', "null pointer"],
  ['char dest[4] = "abc"; int main() { memset(NULL, 0, 0); return 0; }', "null pointer"],
  ['char dest[4] = "abc"; int main() { char *p = malloc(4); free(p); memset(p, 0, 1); return 0; }', "invalid storage"],
  ['char dest[4] = "abc"; int main() { memset("abc", 0, 2); return 0; }', "protected destination"],
  ['const char dest[4] = "abc"; int main() { memset((void *)dest, 0, 1); return 0; }', "protected destination"],
  ['struct S { char c; const int n; }; struct S dest = {\'x\', 2}; int main() { memset(&dest, 0, sizeof dest); return 0; }', "protected destination"],
], true);
rejectionGroup("memset", "invalid counts", [
  ['char dest[4] = "abc"; int main() { memset(dest + 1, 0, 4); return 0; }', "invalid storage"],
  ['char dest[4] = "abc"; int main() { memset(dest, 0, -1); return 0; }', "invalid storage"],
  ['char dest[4] = "abc"; int main() { memset(dest + 4, 0, 1); return 0; }', "invalid storage"],
], true);
rejectionGroup("strcpy", "overlap", [
  ['char dest[8] = "abc"; int main() { strcpy(dest + 1, dest); return 0; }', "overlapping ranges"],
  ['char dest[8] = "abc"; int main() { strcpy(dest, dest + 1); return 0; }', "overlapping ranges"],
  ['char dest[8] = "abc"; int main() { strcpy(dest, dest); return 0; }', "overlapping ranges"],
], true);
rejectionGroup("strcpy", "invalid storage", [
  ['char dest[2] = "a"; int main() { strcpy(dest, "abc"); return 0; }', "invalid storage"],
  ['char dest[4] = "abc"; int main() { strcpy(NULL, "a"); return 0; }', "null pointer"],
  ['char dest[4] = "abc"; int main() { strcpy(dest, NULL); return 0; }', "null pointer"],
  ['char dest[4] = "abc"; int main() { char *p = malloc(4); free(p); strcpy(dest, p); return 0; }', "invalid storage"],
  ['char dest[4] = "abc"; int main() { char *p = malloc(4); free(p); strcpy(p, dest); return 0; }', "invalid storage"],
  ['const char dest[4] = "abc"; int main() { strcpy((char *)dest, "x"); return 0; }', "protected destination"],
  ['char dest[4] = "abc"; int main() { strcpy("abc", dest); return 0; }', "protected destination"],
  ['char dest[4] = "abc"; int main() { char src[2] = {\'a\', \'b\'}; strcpy(dest, src); return 0; }', "missing terminator"],
], true);

describe("b1-string headers and declarations", () => {
  for (const endianness of ["little", "big"] as const) {
    it(`converts every argument before writing (${endianness})`, () => {
      reject('char dest[4] = "abc"; int main() { memset(dest, 1e100, 2); return 0; }',
        "", "out of range for type", endianness, true);
      reject('char dest[4] = "abc"; int main() { memset(dest, 1, 1e100); return 0; }',
        "", "out of range for type", endianness, true);
    });
  }
  for (const [source, reason] of [
    ['int main() { return strlen("hi"); }', /identifier strlen not declared/],
    ['int strlen(const char *s); int main() { return 0; }', /conflicting types.*strlen/],
    ['unsigned int strlen(const char *s) { return 0; } int main() { return 0; }', /redefinition of native function.*strlen/],
    ['#include <string.h>\nint main() { return strlen(); }', /number of arguments/],
    ['#include <string.h>\nint main() { const char dest[2] = "a"; strcpy(dest, "b"); return 0; }', /mismatch in argument type/],
    ['#include <string.h>\nint main() { const int dest = 1; memset(&dest, 0, 1); return 0; }', /mismatch in argument type/],
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
