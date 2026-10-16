import { assert } from "chai";
import { describe, it } from "mocha";
import interpreter from "../src/index";
import { TypeCheckingError } from "../src/typing/errors";

const check = (source: string): void => {
  interpreter.typeCheck(interpreter.parseProgram(source));
};

describe("integer constant expression rejection reasons", () => {
  for (const expression of [
    "x",
    "c",
    "f()",
    "(x = 1)",
    "++x",
    "--x",
    "x++",
    "x--",
    "(1, 2)",
    "(int *)0",
    "(float)1",
    "(void)1",
    "1.5",
    "(int)1.5",
  ])
    for (const context of ["assertion", "designator"])
      it(`rejects ${expression} in a ${context}`, () => {
        const use =
          context === "assertion"
            ? `_Static_assert(${expression}, "must be constant");`
            : `int a[5] = { [${expression}] = 9 };`;
        assert.throws(
          () =>
            check(`int f(void) { return 1; }
            int main(void) { int x = 1; const int c = 1; ${use} return 0; }`),
          TypeCheckingError,
          /integer constant expression/,
        );
      });

  for (const source of [
    '_Static_assert(1 + 1 == 3, "failed arithmetic"); int main(void) { return 0; }',
    'int main(void) { _Static_assert(2 - 2, "failed arithmetic"); return 0; }',
    'struct S { _Static_assert(0, "failed " "arithmetic"); int x; }; int main(void) { return 0; }',
    'union U { _Static_assert(0, "failed arithmetic"); int x; }; int main(void) { return 0; }',
  ])
    it(`reports the failed assertion message: ${source}`, () => {
      assert.throws(
        () => check(source),
        TypeCheckingError,
        /failed arithmetic/,
      );
    });

  for (const index of ["-1", "2 + 3", "~0ULL"])
    it(`rejects out-of-bounds designator ${index}`, () => {
      assert.throws(
        () =>
          check(`int main(void) { int a[5] = { [${index}] = 9 }; return 0; }`),
        TypeCheckingError,
        /index for array designator out of bounds/,
      );
    });

  it("rejects an ordinary variable shadowing an enumerator", () => {
    assert.throws(
      () =>
        check(`enum { INDEX = 1 };
        int main(void) { int INDEX = 2; int a[4] = { [INDEX] = 9 }; return 0; }`),
      TypeCheckingError,
      /integer constant expression/,
    );
  });

  it("keeps an inferred array incomplete inside its designator", () => {
    assert.throws(
      () =>
        check("int main(void) { int a[] = { [sizeof(a)] = 1 }; return 0; }"),
      TypeCheckingError,
      /sizeof operator requires complete object type/,
    );
  });

  for (const type of ["void", "int[]", "int(void)"])
    it(`rejects _Alignof(${type})`, () => {
      assert.throws(
        () =>
          check(
            `_Static_assert(_Alignof(${type}), "alignment"); int main(void) { return 0; }`,
          ),
        TypeCheckingError,
        /_Alignof operator requires complete object type/,
      );
    });
});

describe("integer constant expression undefined behaviour guards", () => {
  for (const expression of [
    "2147483647 + 1",
    "-2147483647 - 2",
    "2147483647 * 2",
    "(-2147483647 - 1) / -1",
    "(-2147483647 - 1) % -1",
    "-(-2147483647 - 1)",
    "1 / 0",
    "1 % 0",
    "1 << -1",
    "1 << 32",
    "-1 << 1",
    "2147483647 << 1",
  ])
    it(`diagnoses ${expression} while folding`, () => {
      assert.throws(
        () =>
          check(
            `_Static_assert(${expression}, "overflow"); int main(void) { return 0; }`,
          ),
        /undefined behaviour/,
      );
    });
});
