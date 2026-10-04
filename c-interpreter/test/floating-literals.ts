import { assert } from "chai";
import { describe, it } from "mocha";
import cviz from "../src/index";
import {
  isFloatingConstant,
  isIntegerConstant,
  isTypedFloatingConstant,
  isTypedIntegerConstant,
} from "../src/ast/types";
import { Type } from "../src/typing/types";

describe("floating literal AST", () => {
  it("keeps the suffix, source range, and distinct integer/float node kinds", () => {
    const source = "int main() {\n  .5F;\n  17;\n  'a';\n  return 0;\n}";
    const ast = cviz.parseProgram(source);
    const fn = ast.value[0];
    assert(fn.type === "FunctionDefinition");
    const statements = fn.body.value;
    const first = statements[0];
    assert(first.type === "ExpressionStatement");
    assert(first.value.type === "PrimaryExprConstant");
    const literal = first.value.value;
    assert(isFloatingConstant(literal));
    assert.isFalse(isIntegerConstant(literal));
    assert.equal(literal.value, 0.5);
    assert.isTrue(literal.isFloat);
    assert.equal(literal.src, ".5F");
    assert.equal(literal.start.line, 2);
    assert.equal(literal.start.column, 3);
    assert.equal(source.slice(literal.start.offset, literal.end.offset), ".5F");

    const typed = cviz.typeCheck(ast).value[0];
    assert(typed.type === "FunctionDefinition");
    const values = typed.body.value.slice(0, 3).map((s) => {
      assert(s.type === "ExpressionStatement");
      assert(s.value.type === "PrimaryExprConstant");
      return s.value;
    });
    assert.isTrue(isTypedFloatingConstant(values[0].value));
    assert.isFalse(isTypedIntegerConstant(values[0].value));
    assert.equal(values[0].typeInfo.type, Type.Float);
    assert.isFalse(values[0].lvalue);
    assert.isTrue(isTypedIntegerConstant(values[1].value));
    assert.isFalse(isTypedFloatingConstant(values[1].value));
    assert.equal(values[2].value, "a");
    assert.equal(values[2].typeInfo.type, Type.Int);
  });
});

describe("floating literal rejection reasons", () => {
  it("reserves double as a keyword instead of accepting it as an identifier", () => {
    assert.throws(
      () => cviz.parseProgram("int main() { return double; }"),
      /Expected/,
    );
  });
  for (const literal of ["0x1.8p3", "0X1P+2F", "0x.8p-1"])
    it(`keeps hexadecimal ${literal} explicitly unsupported`, () => {
      assert.throws(
        () => cviz.parseProgram(`int main() { ${literal}; return 0; }`),
        /not implemented: hex floating constant/,
      );
    });

  for (const literal of ["1e", "1.0ff", "1f"])
    it(`rejects malformed ${literal}`, () => {
      assert.throws(
        () => cviz.parseProgram(`int main() { ${literal}; return 0; }`),
        /Expected/,
      );
    });

  for (const literal of ["1e400", "1e40f", "1e400L"])
    it(`diagnoses overflow of ${literal} during type checking`, () => {
      assert.throws(
        () =>
          cviz.typeCheck(
            cviz.parseProgram(`int main() { ${literal}; return 0; }`),
          ),
        /floating constant .* outside finite range/,
      );
    });

  it("does not treat floating zero as a null pointer constant", () => {
    assert.throws(
      () =>
        cviz.typeCheck(
          cviz.parseProgram("int main() { int *p = 0.0; return 0; }"),
        ),
      /invalid initializer type for scalar/,
    );
  });
});
