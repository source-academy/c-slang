import { assert } from "chai";
import { describe, it } from "mocha";
import cviz from "../src/index";

const run = (source: string): void => {
  const rt = cviz.run(source);
  for (let step = 0; step < 10000 && rt.exitCode === undefined; step++)
    rt.next();
  assert.isDefined(rt.exitCode, "program did not terminate");
};

describe("floating unary and update rejection reasons", () => {
  for (const expression of ["~1.0f", "~2.0"])
    it(`rejects ${expression}`, () => {
      assert.throws(
        () =>
          cviz.typeCheck(
            cviz.parseProgram(`int main() { ${expression}; return 0; }`),
          ),
        /operand of ~ must be of integeral type/,
      );
    });

  for (const op of ["%=", "<<=", ">>=", "&=", "^=", "|="])
    for (const declaration of [
      "float x = 1.0f; int y = 2;",
      "int x = 1; double y = 2.0;",
    ])
      it(`rejects ${op} with floating operands: ${declaration}`, () => {
        assert.throws(
          () =>
            cviz.typeCheck(
              cviz.parseProgram(
                `int main() { ${declaration} x ${op} y; return 0; }`,
              ),
            ),
          /invalid assignment expression/,
        );
      });

  for (const [declaration, expression] of [
    ["struct S { int value; } x = {1};", "++x"],
    ["union U { double value; } x = {1.0};", "x--"],
    ["float x[2] = {1.0f, 2.0f};", "x++"],
    ["const double x = 1.0;", "++x"],
    ["const float x = 1.0f;", "x--"],
    ["", "++1.0"],
  ])
    it(`requires a modifiable scalar lvalue for ${expression}: ${declaration}`, () => {
      assert.throws(
        () =>
          cviz.typeCheck(
            cviz.parseProgram(
              `int main() { ${declaration} ${expression}; return 0; }`,
            ),
          ),
        /modifiable lvalue of arithmetic or pointer type/,
      );
    });

  for (const expression of ["++*p", "(*p)--", "*p += 0.5"])
    it(`preserves const memory protection for ${expression}`, () => {
      assert.throws(
        () =>
          run(
            `int main() { const double x = 1.0; double *p = (double *)&x; ${expression}; return 0; }`,
          ),
        /segmentation fault \(tried to write to/,
      );
    });

  for (const [declaration, expression, reason] of [
    ["unsigned char x = 255;", "x += 1.0", /out of range/],
    ["int x = 1;", "x *= 1e20", /out of range/],
    ["int x = 1;", "x /= 0.0", /cannot convert non-finite/],
    ["unsigned int x = 0;", "x -= 1.0f", /out of range/],
  ] as const)
    it(`checks conversion back to the integer destination: ${expression}`, () => {
      assert.throws(
        () => run(`int main() { ${declaration} ${expression}; return 0; }`),
        reason,
      );
    });
});

describe("prefix update result is not an lvalue", () => {
  for (const type of ["int", "float", "double"])
    for (const expression of ["++x = 3", "--x = 3", "&++x", "&--x", "++(++x)"])
      it(`rejects ${expression} for ${type}`, () => {
        assert.throws(
          () =>
            cviz.typeCheck(
              cviz.parseProgram(
                `int main() { ${type} x = 1; ${expression}; return 0; }`,
              ),
            ),
          /modifiable lvalue|& operator typing constraints/,
        );
      });
});
