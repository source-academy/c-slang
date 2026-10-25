import { readFileSync } from "fs";
import { assert } from "chai";
import { describe, it } from "mocha";
import cviz from "../src/index";

/* eslint-disable @typescript-eslint/no-explicit-any */
const findNode = (obj: any, pred: (n: any) => boolean): any => {
  if (obj === null || typeof obj !== "object") return undefined;
  if (typeof obj.type === "string" && pred(obj)) return obj;
  for (const key of Object.keys(obj)) {
    const found = findNode(obj[key], pred);
    if (found !== undefined) return found;
  }
  return undefined;
};

const outerChain = (source: string, op: string): any => {
  const typed = cviz.typeCheck(cviz.parseProgram(source));
  const node = findNode(typed, (n) => n.type === "BinaryExpr" && n.op === op && n.src.trim() === source.match(/return (.*);/)![1]);
  assert.exists(node, `expected the whole chain as a ${op} node`);
  return node;
};

// A node's offsets, line and column must describe its own src.
const checkSpan = (node: any, source: string): void => {
  assert.equal(source.slice(node.start.offset, node.end.offset), node.src);
  assert.equal(node.start.line, 1);
  assert.equal(node.end.line, 1);
  assert.equal(node.start.column, node.start.offset + 1);
  assert.equal(node.end.column, node.end.offset + 1);
};
/* eslint-enable @typescript-eslint/no-explicit-any */

describe("binary expression position tracking", () => {
  it("a left-associative chain's inner node gets its own span, not the chain's", () => {
    const source = "int main() { int a = 1, b = 2, c = 3; return a - b + c; }";
    const outer = outerChain(source, "+");
    const inner = outer.left;
    assert.equal(inner.type, "BinaryExpr");
    assert.equal(inner.op, "-");
    assert.equal(inner.src.trim(), "a - b");
    assert.equal(inner.start.offset, outer.start.offset);
    assert.isBelow(inner.end.offset, outer.end.offset);
    assert.equal(outer.right.src.trim(), "c");
    checkSpan(inner, source);
    checkSpan(outer, source);
  });

  it("each level of a longer chain nests one operand deeper", () => {
    const source = "int main() { int a = 1, b = 2, c = 3, d = 4; return a * b * c * d; }";
    let node = outerChain(source, "*");
    const levels: string[] = [];
    while (node.type === "BinaryExpr") {
      levels.push(node.src.trim());
      checkSpan(node, source);
      node = node.left;
    }
    assert.deepEqual(levels, ["a * b * c * d", "a * b * c", "a * b"]);
    assert.equal(node.src.trim(), "a");
  });

  it("a higher-precedence chain inside an operand keeps its own span", () => {
    const source = "int main() { int a = 1, b = 2, c = 3, d = 4, e = 5; return a + b * c * d + e; }";
    const outer = outerChain(source, "+");
    assert.equal(outer.left.src.trim(), "a + b * c * d");
    const product = outer.left.right;
    assert.equal(product.op, "*");
    assert.equal(product.src.trim(), "b * c * d");
    assert.equal(product.left.src.trim(), "b * c");
    checkSpan(product, source);
    checkSpan(product.left, source);
  });

  it("logical chains are covered too", () => {
    const source = "int main() { int a = 1, b = 2, c = 3; return a && b && c; }";
    const outer = outerChain(source, "&&");
    assert.equal(outer.left.src.trim(), "a && b");
    checkSpan(outer.left, source);
  });

  it("a note raised inside a chain names only that operation", () => {
    const rt = cviz.run(readFileSync("test/binary-chain-spans-shift.c", "utf8"));
    while (rt.exitCode === undefined) rt.next();
    assert.equal(rt.exitCode, 0);
    const spans = rt.notes.getNotes().map((n) => n.ranges.map((r) => r.src.trim()).join("|"));
    assert.deepEqual(spans, ["x >> 1", "x >> 1 >> 1"]);
  });
});
