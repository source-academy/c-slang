import { assert } from "chai";
import { describe, it } from "mocha";
import cviz from "../src/index";
import { Endianness } from "../src/config";
import { UnsequencedAccessError } from "../src/interpreter/errors";

const run = (source: string, endianness: Endianness) => {
  const rt = cviz.run(source, { endianness });
  while (rt.exitCode === undefined) rt.next();
  return rt;
};

describe("B4.5 unsequenced access faults", () => {
  for (const endianness of ["little", "big"] as const) {
    describe(endianness, () => {
      for (const [source, reason] of [
        [
          "int main(void) { int i = 1; return i++ + i++; }",
          /undefined behaviour: 'i' is modified by both `i\+\+` and `i\+\+` in the same expression with no sequence point between them \(C17 6\.5p2\)/,
        ],
        [
          "int f(int a, int b) { return a + b; } int main(void) { int x = 1; return f(x, x++); }",
          /'x' is modified by `x\+\+` and read by `x`/,
        ],
        [
          "int main(void) { int a[3] = {0, 0, 0}; int i = 0; a[i] = i++; return a[0]; }",
          /'i' is modified by `i\+\+` and read by `a\[i\]`/,
        ],
        [
          "int main(void) { int x = 0; return (x = 1) + x; }",
          /'x' is modified by `\(x = 1\)` and read by `x`/,
        ],
        [
          "int main(void) { int i = 0; return (i++, 0) + i; }",
          /'i' is modified by `\(i\+\+, 0\)` and read by `i`/,
        ],
      ] as const) {
        it(source, () => {
          assert.throws(() => run(source, endianness), UnsequencedAccessError, reason);
        });
      }

      it("a modification here against a read inside a call is only unspecified", () => {
        // Left to right here: 0 + 1 - 1. A compiler may evaluate g() first.
        const rt = run(
          "int i = 0; int g(void) { return i; } int main(void) { return i++ + g() - 1; }",
          endianness,
        );
        assert.equal(rt.exitCode, 0);
        const notes = rt.notes.getNotes();
        assert.lengthOf(notes, 1);
        assert.equal(notes[0].kind, "unspecified-order");
        assert.match(notes[0].message, /the left operand `i\+\+` modified 'i' and the right operand `g\(\)` read it/);
      });
    });
  }

  it("preserves UnsequencedAccessError's prototype chain and message", () => {
    const error = new UnsequencedAccessError("'i' is modified twice");
    assert.instanceOf(error, UnsequencedAccessError);
    assert.instanceOf(error, Error);
    assert.strictEqual(Object.getPrototypeOf(error), UnsequencedAccessError.prototype);
    assert.equal(error.message, "undefined behaviour: 'i' is modified twice");
  });
});
