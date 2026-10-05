import { assert } from "chai";
import { describe, it } from "mocha";
import cviz from "../src/index";
import { Endianness } from "../src/config";
import { stringify } from "../src/interpreter/object";
import { FLOAT_TO_BYTES } from "../src/typing/representation";
import {
  array,
  char,
  constQualified,
  doubleType,
  floatType,
  int,
  pointer,
} from "../src/typing/types";

for (const endianness of ["little", "big"] as Endianness[])
  describe(`floating object formatting (${endianness} endian)`, () => {
    const memory = cviz.run("int main() { return 0; }", { endianness }).memory;

    it("decodes known IEEE bytes and preserves their signs without mutation", () => {
      for (const [type, bigEndianBytes, expected] of [
        [floatType(), [0x3f, 0xa0, 0, 0], "1.25"],
        [floatType(), [0xc0, 0x20, 0, 0], "-2.5"],
        [floatType(), [0x80, 0, 0, 0], "-0"],
        [doubleType(), [0x3f, 0xf4, 0, 0, 0, 0, 0, 0], "1.25"],
        [doubleType(), [0xc0, 0x04, 0, 0, 0, 0, 0, 0], "-2.5"],
        [doubleType(), [0x80, 0, 0, 0, 0, 0, 0, 0], "-0"],
      ] as const) {
        const bytes = [...bigEndianBytes];
        if (endianness === "little") bytes.reverse();
        const original = [...bytes];
        assert.equal(stringify(bytes, type, endianness, memory), expected);
        assert.deepEqual(bytes, original);
      }
    });

    it("formats arrays directly, including nested arrays and const elements", () => {
      for (const type of [floatType(), doubleType()]) {
        const bytes = [1.25, -0, Infinity, NaN].flatMap((value) =>
          FLOAT_TO_BYTES[type.type](value, endianness),
        );
        const row = array(constQualified(type), 2);
        assert.equal(
          stringify(bytes, array(row, 2), endianness, memory),
          "[[1.25, -0], [Infinity, NaN]]",
        );
      }
    });

    it("preserves integer, character, and floating-pointer formatting", () => {
      assert.equal(
        stringify([255, 255, 255, 255], int(), endianness, memory),
        "-1",
      );
      assert.equal(stringify([65], char(), endianness, memory), "'A'");
      for (const type of [floatType(), doubleType()]) {
        assert.equal(
          stringify([0, 0, 0, 0], pointer(type), endianness, memory),
          "NULL",
        );
        const bytes = endianness === "little" ? [0, 16, 0, 0] : [0, 0, 16, 0];
        assert.equal(
          stringify(bytes, pointer(type), endianness, memory),
          "0x00001000",
        );
      }
    });

    it("rejects byte counts that do not match the floating object type", () => {
      for (const type of [floatType(), doubleType()])
        for (const length of [0, type.size - 1, type.size + 1])
          assert.throws(
            () =>
              stringify(new Array(length).fill(0), type, endianness, memory),
            /number of bytes do not match type given/,
          );
    });
  });

describe("floating aggregate const protection", () => {
  for (const [name, declaration, assignment] of [
    ["const double", "const double x = 1.25;", "x = 2.5"],
    [
      "pointer to const double",
      "const double x = 1.25; const double *p = &x;",
      "*p = 2.5",
    ],
    [
      "member of const struct",
      "const struct S { float x; } s = {1.25f};",
      "s.x = 2.5f",
    ],
    [
      "const float array element",
      "const float a[2] = {1.25f, 2.5f};",
      "a[1] = 3.75f",
    ],
    [
      "matrix element of const struct",
      "const struct S { double a[2][2]; } s = {{{1, 2}, {3, 4}}};",
      "s.a[1][1] = 5.0",
    ],
  ])
    it(`rejects assignment to ${name}`, () => {
      assert.throws(
        () =>
          cviz.typeCheck(
            cviz.parseProgram(
              `int main() { ${declaration} ${assignment}; return 0; }`,
            ),
          ),
        /modifiable lvalue/,
      );
    });

  it("protects a const interior double member when qualification is cast away", () => {
    const source = `
      int main() {
        const struct S { char tag; double value; } s = {'A', 1.25};
        double *p = (double *)&s.value;
        *p = 2.5;
        return 0;
      }
    `;
    for (const endianness of ["little", "big"] as Endianness[])
      assert.throws(() => {
        const rt = cviz.run(source, { endianness });
        while (rt.exitCode === undefined) rt.next();
      }, /segmentation fault \(tried to write to/);
  });

  it("protects const matrix bytes after decay and a cast", () => {
    for (const endianness of ["little", "big"] as Endianness[])
      assert.throws(() => {
        const rt = cviz.run(
          `
          int main() {
            const struct S { double a[2][2]; } s = {{{1, 2}, {3, 4}}};
            double *p = (double *)s.a[1];
            p[1] = 5.0;
            return 0;
          }
        `,
          { endianness },
        );
        while (rt.exitCode === undefined) rt.next();
      }, /segmentation fault \(tried to write to/);
  });
});
