import { assert } from "chai";
import { describe, it } from "mocha";
import "../src/types";
import interpreter from "../src/index";

describe("sizeof name resolution rejection reasons", () => {
  for (const [name, source, reason] of [
    [
      "incomplete array in its own initializer",
      "int main(void) { int a[] = {sizeof(a)}; return 0; }",
      /sizeof operator requires complete object type/,
    ],
    [
      "sizeof a function",
      "int f(void) { return 0; } int main(void) { return sizeof(f); }",
      /sizeof operator requires complete object type/,
    ],
    [
      "sizeof an incomplete type",
      "int main(void) { return sizeof(int []); }",
      /sizeof operator requires complete object type/,
    ],
    [
      "unknown identifier",
      "int main(void) { return sizeof(missing); }",
      /identifier missing not declared/,
    ],
  ] as const) {
    it(name, () => assert.throws(() => interpreter.run(source), reason));
  }

  it("does not treat a hidden typedef as a cast type", () => {
    assert.throws(() =>
      interpreter.parseProgram(
        "typedef int T; int main(void) { int T = 2; return (T)1; }",
      ),
    );
  });

  it("a parameter hides a typedef for later parameters", () => {
    assert.throws(() =>
      interpreter.parseProgram("typedef int T; int f(int T, T x);"),
    );
  });

  it("does not accept a typedef name as an expression constant", () => {
    assert.throws(() =>
      interpreter.parseProgram("typedef int T; int main(void) { return (T); }"),
    );
  });

  it("does not leak scope between parse calls after failure", () => {
    assert.throws(() =>
      interpreter.parseProgram("int main(void) { typedef int Lost;"),
    );
    assert.throws(() =>
      interpreter.parseProgram("int main(void) { return (Lost)1; }"),
    );
  });
});
