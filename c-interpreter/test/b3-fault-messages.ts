import { assert } from "chai";
import { describe, it } from "mocha";
import cviz from "../src/index";
import { MemoryError, SegmentationFault } from "../src/memory/errors";

const run = (source: string) => {
  const rt = cviz.run("#include <stdlib.h>\n" + source);
  for (let steps = 0; steps < 20000 && rt.exitCode === undefined; steps++) rt.next();
  return rt;
};

const rejects = (source: string, expected: RegExp) => {
  let caught: unknown;
  try {
    run(source);
  } catch (error) {
    caught = error;
  }
  assert.instanceOf(caught, MemoryError);
  assert.match((caught as Error).message, expected);
  return caught as Error;
};

describe("B3.3 fault messages", () => {
  it("names the array, its declared size, and how far past the end an out-of-bounds write landed", () => {
    const error = rejects(
      "int main() { int a[4] = {1, 2, 3, 4}; a[10] = 1; return 0; }",
      /24 byte\(s\) past the end of 'a' \(arr of int, 16 byte\(s\)\), declared at line \d+/,
    );
    assert.instanceOf(error, SegmentationFault);
  });

  it("identifies a read through a freed heap allocation as a use-after-free, not a bare address", () => {
    const error = rejects(
      "int main() { int *p = malloc(sizeof(int)); free(p); return *p; }",
      /freed \(use-after-free\)/,
    );
    assert.instanceOf(error, SegmentationFault);
  });

  it("gives a null pointer dereference its own dedicated wording", () => {
    const error = rejects(
      "int main() { int *p = 0; return *p; }",
      /null pointer/,
    );
    assert.instanceOf(error, SegmentationFault);
    assert.notMatch(error.message, /0x00000000|0x0{4,}/);
  });

  it("keeps const protection on a direct write, unaffected by the message refactor", () => {
    rejects(
      "int main() { const int x = 1; int *p = (int *)&x; *p = 2; return 0; }",
      /write to .*(const|'x')/,
    );
  });
});
