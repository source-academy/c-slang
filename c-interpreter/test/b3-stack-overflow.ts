import { assert } from "chai";
import { describe, it } from "mocha";
import cviz from "../src/index";
import { StackOverflowError } from "../src/memory/errors";
import { DEFAULT_CONFIG, Endianness, RuntimeConfig } from "../src/config";

// A deliberately tiny stack: large enough for a handful of frames, far too
// small for the runaway recursion each test drives into it.
const withSmallStack = (size: number, endianness: Endianness): Partial<RuntimeConfig> => ({
  endianness,
  memory: { ...DEFAULT_CONFIG.memory, stack: { ...DEFAULT_CONFIG.memory.stack, size } },
});

const runToOverflow = (source: string, config: Partial<RuntimeConfig>) => {
  const rt = cviz.run(source, config);
  for (let steps = 0; steps < 20000 && rt.exitCode === undefined; steps++) rt.next();
  return rt;
};

describe("B3.1 stack overflow", () => {
  for (const endianness of ["little", "big"] as const) {
    it(`throws StackOverflowError for runaway recursion with no locals (${endianness})`, () => {
      const source = "int f(int n) { if (n == 0) return 0; return f(n - 1); } int main() { return f(1000000); }";
      assert.throws(
        () => runToOverflow(source, withSmallStack(64, endianness)),
        StackOverflowError,
        /exceeded the configured 64-byte stack/,
      );
    });

    it(`throws StackOverflowError before any out-of-range local access, for recursion with locals (${endianness})`, () => {
      const source =
        "int g(int n) { int local = n; if (n == 0) return 0; return g(n - 1) + local; } int main() { return g(1000000); }";
      let caught: unknown;
      try {
        runToOverflow(source, withSmallStack(64, endianness));
      } catch (error) {
        caught = error;
      }
      assert.instanceOf(caught, StackOverflowError);
      assert.match((caught as Error).message, /recursing into 'g'/);
    });
  }

  it("does not false-positive: recursion comfortably within a default-sized stack still completes", () => {
    const source = "int sum(int n) { if (n == 0) return 0; return n + sum(n - 1); } int main() { return sum(50) == 1275 ? 0 : 1; }";
    const rt = runToOverflow(source, {});
    assert.strictEqual(rt.exitCode, 0);
  });

  it("names the recursing function and reports the configured size", () => {
    const source = "int f(int n) { if (n == 0) return 0; return f(n - 1); } int main() { return f(1000000); }";
    let caught: unknown;
    try {
      runToOverflow(source, withSmallStack(64, "little"));
    } catch (error) {
      caught = error;
    }
    assert.instanceOf(caught, StackOverflowError);
    assert.match((caught as Error).message, /recursing into 'f'/);
    assert.match((caught as Error).message, /64-byte stack/);
  });
});
