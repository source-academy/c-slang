import { assert } from "chai";
import { describe, it } from "mocha";
import * as limits from "../src/constants";
import * as types from "../src/typing/types";
import { FLOAT_TO_BYTES, bytesToFloat } from "../src/typing/representation";
import {
  applyIntegerPromotions,
  applyUsualArithmeticConversions,
} from "../src/typing/conversions";
import {
  getTypeInfoFromSpecifiers,
  TYPE_SPECIFIER_TO_NUMERICAL_LIMIT,
} from "../src/typing/specifiers";

describe("floating type metadata", () => {
  it("classifies float and double as arithmetic scalar object types", () => {
    for (const t of [types.floatType(), types.doubleType()]) {
      assert.isTrue(types.isFloatingType(t));
      assert.isTrue(types.isArithmeticType(t));
      assert.isTrue(types.isScalarType(t));
      assert.isTrue(types.isObjectTypeInfo(t));
      assert.isFalse(types.isIntegerType(t));
    }
    assert.isFalse(types.isFloatingType(types.int()));
    assert.isFalse(types.isFloatingType(types.pointer(types.int())));
    assert.isTrue(types.isFloatType(types.floatType()));
    assert.isFalse(types.isFloatType(types.doubleType()));
    assert.isTrue(types.isDoubleType(types.doubleType()));
    assert.isFalse(types.isDoubleType(types.floatType()));
  });

  it("uses four-byte float and eight-byte double layouts", () => {
    const f = types.floatType();
    const d = types.doubleType();
    assert.deepEqual([f.size, f.alignment, d.size, d.alignment], [4, 4, 8, 8]);
    assert.equal(types.getTypeName(f), "float");
    assert.equal(types.getTypeName(d), "double");
    assert.equal(types.array(d, 3).size, 24);
    const s = types.structure([{ type: f }, { type: d }]);
    assert.deepEqual(
      s.members.map((m) => m.relativeAddress),
      [0, 8],
    );
    assert.equal(s.size, 16);
  });

  it("requires matching floating types and qualifiers for compatibility", () => {
    for (const make of [types.floatType, types.doubleType]) {
      const t = make();
      const qualified = types.constQualified(t);
      assert.isTrue(t.isCompatible(make()));
      assert.isFalse(t.isCompatible(qualified));
      assert.isFalse(qualified.isCompatible(t));
      assert.isTrue(qualified.isCompatible(types.constQualified(make())));
      assert.isTrue(types.unqualified(qualified).isCompatible(t));
      assert.isUndefined(t.const);
      assert.isFalse(t.isCompatible(types.int()));
    }
    assert.isFalse(types.floatType().isCompatible(types.doubleType()));
    assert.isFalse(types.doubleType().isCompatible(types.floatType()));
  });

  it("resolves floating specifiers, including the long double alias", () => {
    assert.isTrue(types.isFloatType(getTypeInfoFromSpecifiers(["float"])));
    for (const specifiers of [
      ["double"],
      ["long", "double"],
      ["double", "long"],
    ])
      assert.isTrue(types.isDoubleType(getTypeInfoFromSpecifiers(specifiers)));
    for (const specifier of ["float", "double", "long double"])
      assert.notProperty(TYPE_SPECIFIER_TO_NUMERICAL_LIMIT, specifier);
  });

  it("defines normal minima, finite maxima, and spacing above one", () => {
    assert.equal(limits.FLT_MIN, 1.1754943508222875e-38);
    assert.equal(limits.FLT_MAX, 3.4028234663852886e38);
    assert.equal(limits.FLT_EPSILON, 1.1920928955078125e-7);
    assert.equal(limits.DBL_MIN, 2.2250738585072014e-308);
    assert.equal(limits.DBL_MAX, Number.MAX_VALUE);
    assert.equal(limits.DBL_EPSILON, Number.EPSILON);
  });

  it("leaves floating types unchanged by integer promotions", () => {
    for (const t of [types.floatType(), types.doubleType()])
      assert.strictEqual(applyIntegerPromotions(t), t);
    assert.isTrue(types.isInt(applyIntegerPromotions(types.unsignedChar())));
  });

  it("keeps floating operands out of the integer conversion ladder", () => {
    for (const t of [types.floatType(), types.doubleType()]) {
      assert.throws(
        () => applyUsualArithmeticConversions(t, types.int()),
        /floating-point arithmetic conversions not implemented/,
      );
      assert.throws(
        () => applyUsualArithmeticConversions(types.int(), t),
        /floating-point arithmetic conversions not implemented/,
      );
    }
    assert.isTrue(
      types.isUnsignedInt(
        applyUsualArithmeticConversions(types.int(), types.unsignedInt()),
      ),
    );
  });
});

for (const type of [types.Type.Float, types.Type.Double] as const) {
  for (const endian of ["little", "big"] as const) {
    describe(`${type} representation (${endian} endian)`, () => {
      const single = type === types.Type.Float;
      const size = single ? 4 : 8;
      const encode = (n: number) => FLOAT_TO_BYTES[type](n, endian);
      const decode = (bytes: number[]) => bytesToFloat(bytes, type, endian);
      const roundTrip = (n: number) => decode(encode(n));
      const ordered = (bytes: number[]) =>
        endian === "big" ? bytes : bytes.reverse();

      it("encodes and decodes independently known IEEE-754 bytes", () => {
        const expected = ordered(
          single ? [0x3f, 0xc0, 0, 0] : [0x3f, 0xf8, 0, 0, 0, 0, 0, 0],
        );
        const original = [...expected];
        assert.deepEqual(encode(1.5), expected);
        assert.equal(decode(expected), 1.5);
        assert.equal(roundTrip(-2.5), -2.5);
        assert.deepEqual(expected, original);
      });

      it("preserves both zero signs and their bit patterns", () => {
        assert.deepEqual(encode(0), new Array(size).fill(0));
        assert.deepEqual(
          encode(-0),
          ordered([0x80, ...new Array(size - 1).fill(0)]),
        );
        assert.isTrue(Object.is(roundTrip(0), 0));
        assert.isTrue(Object.is(roundTrip(-0), -0));
      });

      it("preserves normal limits and the smallest subnormal", () => {
        const minimum = single ? limits.FLT_MIN : limits.DBL_MIN;
        const maximum = single ? limits.FLT_MAX : limits.DBL_MAX;
        const subnormal = single ? 2 ** -149 : Number.MIN_VALUE;
        assert.equal(roundTrip(minimum), minimum);
        assert.equal(roundTrip(maximum), maximum);
        assert.equal(roundTrip(-maximum), -maximum);
        assert.deepEqual(
          encode(subnormal),
          ordered([...new Array(size - 1).fill(0), 1]),
        );
        assert.equal(roundTrip(subnormal), subnormal);
      });

      it("preserves infinities and recognizes a NaN representation", () => {
        const infinity = ordered(
          single ? [0x7f, 0x80, 0, 0] : [0x7f, 0xf0, 0, 0, 0, 0, 0, 0],
        );
        const nan = ordered(
          single ? [0x7f, 0xc0, 0, 0] : [0x7f, 0xf8, 0, 0, 0, 0, 0, 0],
        );
        assert.deepEqual(encode(Infinity), infinity);
        assert.equal(roundTrip(Infinity), Infinity);
        assert.equal(roundTrip(-Infinity), -Infinity);
        assert.isNaN(roundTrip(NaN));
        assert.isNaN(decode(nan));
      });

      it("rounds to the target precision with ties to even", () => {
        assert.equal(roundTrip(1 + 2 ** -24), single ? 1 : 1 + 2 ** -24);
        assert.equal(
          roundTrip(1 + 3 * 2 ** -24),
          single ? 1 + 2 ** -22 : 1 + 3 * 2 ** -24,
        );
        const epsilon = single ? limits.FLT_EPSILON : limits.DBL_EPSILON;
        assert.isAbove(roundTrip(1 + epsilon), 1);
        if (single) {
          assert.equal(roundTrip(2 ** -150), 0);
          assert.isTrue(Object.is(roundTrip(-(2 ** -150)), -0));
        }
      });
    });
  }
}

describe("floating representation validation", () => {
  it("defaults to little endian", () => {
    const bytes = FLOAT_TO_BYTES[types.Type.Float](1.5);
    assert.deepEqual(bytes, [0, 0, 0xc0, 0x3f]);
    assert.equal(bytesToFloat(bytes, types.Type.Float), 1.5);
  });

  it("rejects byte counts that do not match the requested type", () => {
    for (const type of [types.Type.Float, types.Type.Double] as const)
      for (const length of [0, 3, 5, type === types.Type.Float ? 8 : 4])
        assert.throws(
          () => bytesToFloat(new Array(length).fill(0), type),
          RangeError,
          /byte length/,
        );
  });

  it("rejects invalid bytes instead of silently coercing them", () => {
    for (const byte of [-1, 256, 0.5, NaN, Infinity])
      assert.throws(
        () => bytesToFloat([byte, 0, 0, 0], types.Type.Float),
        /invalid byte/,
      );
  });
});
