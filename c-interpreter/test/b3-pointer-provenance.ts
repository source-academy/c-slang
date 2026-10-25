import { assert } from "chai";
import { describe, it } from "mocha";
import cviz from "../src/index";
import { PointerProvenanceFault } from "../src/memory/errors";

const run = (source: string) => {
  const rt = cviz.run("#include <stdlib.h>\n" + source);
  for (let steps = 0; steps < 20000 && rt.exitCode === undefined; steps++) rt.next();
  return rt;
};

describe("B3.4 scoped pointer provenance", () => {
  it("rejects out-of-bounds array-subscript arithmetic that lands exactly inside an adjacent object", () => {
    const source =
      "int main() { int a[4] = {1, 2, 3, 4}; int b[4] = {5, 6, 7, 8}; return a[4]; }";
    assert.throws(() => run(source), PointerProvenanceFault, /unrelated/);
  });

  it("rejects the same case reached through explicit pointer arithmetic and a round-trip through a variable", () => {
    const source =
      "int main() { int a[4] = {1, 2, 3, 4}; int b[4] = {5, 6, 7, 8}; int *p = a + 4; return *p; }";
    assert.throws(() => run(source), PointerProvenanceFault, /unrelated/);
  });

  it("does not false-positive on a legitimate one-past-the-end pointer that is never dereferenced", () => {
    const source =
      "int main() { int a[4] = {1, 2, 3, 4}; int *p = a + 4; return p == a + 4 ? 0 : 1; }";
    const rt = run(source);
    assert.strictEqual(rt.exitCode, 0);
  });

  it("fails open for an out-of-bounds pointer derived from malloc, a documented residual gap", () => {
    const source =
      "int main() { int *a = malloc(4 * sizeof(int)); int *b = malloc(4 * sizeof(int)); int x = a[4]; free(a); free(b); return 0; }";
    const rt = run(source);
    assert.strictEqual(rt.exitCode, 0);
  });
});
