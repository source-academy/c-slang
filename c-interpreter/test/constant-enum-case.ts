import { assert } from "chai";
import { describe, it } from "mocha";
import interpreter from "../src/index";
import { TypeCheckingError } from "../src/typing/errors";

const check = (source: string): void => {
  interpreter.typeCheck(interpreter.parseProgram(source));
};

describe("computed enum and case rejection reasons", () => {
  for (const expression of ["x + 1", "f()", "(x = 2)", "(int *)0", "1.5"])
    for (const context of ["enum", "case"])
      it(`rejects ${expression} in a computed ${context}`, () => {
        const use =
          context === "enum"
            ? `enum { VALUE = ${expression} };`
            : `switch (1) { case ${expression}: break; }`;
        assert.throws(
          () =>
            check(`int f(void) { return 1; }
            int main(void) { int x = 1; ${use} return 0; }`),
          TypeCheckingError,
          /integer constant expression/,
        );
      });

  for (const declaration of [
    "enum { VALUE = 2147483647LL + 1 };",
    "enum { VALUE = -2147483647LL - 2 };",
    "enum { VALUE = 2147483646 + 1, NEXT };",
  ])
    it(`range-checks computed enumerators: ${declaration}`, () => {
      assert.throws(
        () => check(`${declaration} int main(void) { return 0; }`),
        TypeCheckingError,
        /enumerator .* out of int range/,
      );
    });

  for (const [control, first, second] of [
    ["0", "1 + 1", "4 / 2"],
    ["0u", "-1", "~0u"],
    ["0", "(char)300", "44"],
  ])
    it(`rejects duplicate cases after folding/conversion: ${first}, ${second}`, () => {
      assert.throws(
        () =>
          check(`int main(void) { switch (${control}) {
          case ${first}: break; case ${second}: break;
        } return 0; }`),
        TypeCheckingError,
        /duplicate case value/,
      );
    });

  for (const use of [
    "enum { VALUE = 2147483647 + 1 };",
    "switch (0) { case 2147483647 + 1: break; }",
  ])
    it(`preserves overflow errors in ${use}`, () => {
      assert.throws(
        () => check(`int main(void) { ${use} return 0; }`),
        /undefined behaviour/,
      );
    });
});
