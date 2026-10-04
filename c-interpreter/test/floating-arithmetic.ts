import { assert } from "chai";
import { describe, it } from "mocha";
import cviz from "../src/index";
import { applyUsualArithmeticConversions } from "../src/typing/conversions";
import { bigintToFloat } from "../src/typing/representation";
import * as types from "../src/typing/types";

describe("usual arithmetic conversions", () => {
  for (const floating of [types.floatType(), types.doubleType()])
    it(`${floating.type} takes precedence over every integer type in either order`, () => {
      for (const integer of [
        types._bool(),
        types.char(),
        types.signedChar(),
        types.unsignedChar(),
        types.shortInt(),
        types.unsignedShortInt(),
        types.int(),
        types.unsignedInt(),
        types.longInt(),
        types.unsignedLongInt(),
        types.longLongInt(),
        types.unsignedLongLongInt(),
      ]) {
        assert.equal(
          applyUsualArithmeticConversions(floating, integer).type,
          floating.type,
        );
        assert.equal(
          applyUsualArithmeticConversions(integer, floating).type,
          floating.type,
        );
      }
    });

  it("chooses double for mixed floating operands in either order", () => {
    assert.equal(
      applyUsualArithmeticConversions(types.floatType(), types.doubleType())
        .type,
      types.Type.Double,
    );
    assert.equal(
      applyUsualArithmeticConversions(types.doubleType(), types.floatType())
        .type,
      types.Type.Double,
    );
  });

  it("retains integer promotions and signed/unsigned rank decisions", () => {
    for (const [left, right, expected] of [
      [types.unsignedChar(), types.shortInt(), types.Type.Int],
      [types.int(), types.unsignedInt(), types.Type.UnsignedInt],
      [types.longInt(), types.unsignedInt(), types.Type.UnsignedLongInt],
      [types.longLongInt(), types.unsignedLongInt(), types.Type.LongLongInt],
      [
        types.longLongInt(),
        types.unsignedLongLongInt(),
        types.Type.UnsignedLongLongInt,
      ],
    ] as const) {
      assert.equal(applyUsualArithmeticConversions(left, right).type, expected);
      assert.equal(applyUsualArithmeticConversions(right, left).type, expected);
    }
  });
});

describe("integer to float rounding", () => {
  it("keeps zero and exactly representable positive and negative integers", () => {
    for (const value of [0, 1, -1, 16777215, -16777215, 16777216, -16777216])
      assert.strictEqual(bigintToFloat(BigInt(value)), value);
  });

  it("rounds halfway values to an even significand in both directions", () => {
    for (const sign of [BigInt(1), BigInt(-1)]) {
      assert.equal(
        bigintToFloat(sign * BigInt(16777217)),
        Number(sign) * 16777216,
      );
      assert.equal(
        bigintToFloat(sign * BigInt(16777219)),
        Number(sign) * 16777220,
      );
    }
  });

  it("distinguishes integers just below, at, and above a float midpoint beyond double precision", () => {
    for (const sign of [BigInt(1), BigInt(-1)])
      for (const [value, expected] of [
        ["4611686293305294847", 4611686018427387904],
        ["4611686293305294848", 4611686018427387904],
        ["4611686293305294849", 4611686568183201792],
        ["4611686843061108735", 4611686568183201792],
        ["4611686843061108736", 4611687117939015680],
        ["4611686843061108737", 4611687117939015680],
      ] as const)
        assert.equal(
          bigintToFloat(sign * BigInt(value)),
          Number(sign) * expected,
        );
  });

  it("handles the signed and unsigned 64-bit limits", () => {
    assert.equal(bigintToFloat(BigInt("9223372036854775807")), 2 ** 63);
    assert.equal(bigintToFloat(BigInt("-9223372036854775808")), -(2 ** 63));
    assert.equal(bigintToFloat(BigInt("18446744073709551615")), 2 ** 64);
  });
});

describe("floating binary rejection reasons", () => {
  for (const op of ["%", "&", "|", "^", "<<", ">>"])
    for (const [left, right] of [
      ["1.0f", "2"],
      ["2", "1.0"],
    ])
      it(`rejects ${left} ${op} ${right} during type checking`, () => {
        assert.throws(
          () =>
            cviz.typeCheck(
              cviz.parseProgram(
                `int main() { ${left} ${op} ${right}; return 0; }`,
              ),
            ),
          /should be of integral type/,
        );
      });

  for (const op of ["/", "%"])
    it(`still rejects integer ${op} by zero`, () => {
      assert.throws(() => {
        const rt = cviz.run(
          `int main() { int zero = 0; return 1 ${op} zero; }`,
        );
        while (rt.exitCode === undefined) rt.next();
      }, /Division by zero/);
    });
});
