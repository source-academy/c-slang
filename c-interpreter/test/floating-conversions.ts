import { assert } from "chai";
import { describe, it } from "mocha";
import cviz from "../src/index";
import { BIGINT_TO_BYTES, bytesToBigint } from "../src/typing/representation";
import * as types from "../src/typing/types";

const run = (source: string): void => {
  const rt = cviz.run(source);
  while (rt.exitCode === undefined) rt.next();
};

describe("floating conversion rejection reasons", () => {
  for (const [target, source] of [
    ["signed char", "128.0"],
    ["signed char", "0.0 - 129.0"],
    ["unsigned char", "256.0"],
    ["unsigned char", "0.0 - 1.0"],
    ["short", "32768.0"],
    ["short", "0.0 - 32769.0"],
    ["unsigned short", "65536.0"],
    ["int", "2147483648.0"],
    ["int", "0.0 - 2147483649.0"],
    ["int", "1e20"],
    ["unsigned int", "4294967296.0"],
    ["unsigned int", "0.0 - 1.0"],
    ["long", "2147483648.0"],
    ["unsigned long", "4294967296.0"],
    ["long long", "9223372036854775808.0"],
    ["long long", "0.0 - 9223372036854777856.0"],
    ["unsigned long long", "18446744073709551616.0"],
  ])
    it(`rejects (${target})(${source}) as out of range`, () => {
      assert.throws(
        () => run(`int main() { (${target})(${source}); return 0; }`),
        /undefined behaviour: .* out of range for type/,
      );
    });

  for (const target of ["int", "unsigned long long"])
    for (const source of ["1.0 / 0.0", "(0.0 - 1.0) / 0.0", "0.0 / 0.0"])
      it(`rejects non-finite (${target})(${source}) explicitly`, () => {
        assert.throws(
          () => run(`int main() { (${target})(${source}); return 0; }`),
          /undefined behaviour: cannot convert non-finite .* to/,
        );
      });

  for (const [name, source] of [
    ["initializer", "int main() { unsigned char x = 256.0; return 0; }"],
    ["assignment", "int main() { unsigned char x = 0; x = 256.0; return 0; }"],
    [
      "argument",
      "void f(unsigned char x) {} int main() { f(256.0); return 0; }",
    ],
    [
      "return",
      "unsigned char f() { return 256.0; } int main() { f(); return 0; }",
    ],
  ])
    it(`range-checks implicit ${name} conversions`, () => {
      assert.throws(
        () => run(source),
        /undefined behaviour: .* out of range for type/,
      );
    });

  for (const source of [
    "int main() { (float)(int *)0; return 0; }",
    "int main() { int x; (double)&x; return 0; }",
    "int main() { (int *)1.0; return 0; }",
    "int main() { (float *)0.0f; return 0; }",
    "int main() { int a[2]; (double)a; return 0; }",
    "int f() { return 0; } int main() { (float)f; return 0; }",
  ])
    it(`rejects pointer/floating casts during type checking: ${source}`, () => {
      assert.throws(
        () => cviz.typeCheck(cviz.parseProgram(source)),
        /cannot cast between pointer and floating types/,
      );
    });

  it("keeps const protection on floating writes through an explicit cast", () => {
    assert.throws(
      () =>
        run(
          "int main() { const float x = 1.5; float *p = (float *)&x; *p = 2; return 0; }",
        ),
      /segmentation fault \(tried to write to/,
    );
  });
});

describe("two's-complement integer minimum representation", () => {
  for (const [type, width] of [
    [types.signedChar(), 8],
    [types.shortInt(), 16],
    [types.int(), 32],
    [types.longInt(), 32],
    [types.longLongInt(), 64],
  ] as const)
    it(`encodes ${type.type}'s minimum and rejects one below it`, () => {
      const minimum = -(BigInt(1) << BigInt(width - 1));
      for (const endian of ["little", "big"] as const) {
        const bytes = BIGINT_TO_BYTES[type.type](minimum, endian);
        assert.equal(bytesToBigint(bytes, true, endian), minimum);
        const expected = [128, ...new Array(type.size - 1).fill(0)];
        assert.deepEqual(
          bytes,
          endian === "big" ? expected : expected.reverse(),
        );
        assert.throws(
          () => BIGINT_TO_BYTES[type.type](minimum - BigInt(1), endian),
          /out of range/,
        );
      }
    });
});
