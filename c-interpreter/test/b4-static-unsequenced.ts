import { readFileSync } from "fs";
import { assert } from "chai";
import { describe, it } from "mocha";
import cviz from "../src/index";
import { NoteSpec } from "../src/interpreter/notes";

const spans = (notes: NoteSpec[]) =>
  notes.map((n) => n.ranges.map((r) => r.src.trim()).join("|"));

describe("B4.6 static unsequenced-conflict notes", () => {
  for (const [source, expected, message] of [
    [
      "int main(void) { int i = 0; i = i++ + 1; return i; }",
      "i = i++ + 1|i++",
      /^undefined behaviour: `i` is modified twice in this expression with no sequence point between the modifications \(C17 6\.5p2\)$/,
    ],
    ["int main(void) { int i = 0; i = i++; return i; }", "i = i++|i++", /`i` is modified twice/],
    ["int main(void) { int x = 1; x += x++; return x; }", "x += x++|x++", /`x` is modified twice/],
    ["int main(void) { int x = 0; x = x = 1; return x; }", "x = x = 1|x = 1", /`x` is modified twice/],
    ["int main(void) { int i = 1; return i++ + i++; }", "i++|i++", /`i` is modified twice/],
    [
      "int main(void) { int a[3] = {0, 0, 0}; int i = 0; a[i] = i++; return a[0]; }",
      "i++|i",
      /^undefined behaviour: `i` is modified and also read in this expression with no sequence point between them \(C17 6\.5p2\)$/,
    ],
    [
      "int f(int a, int b) { return a + b; } int main(void) { int i = 0; return f(i, i++); }",
      "i++|i",
      /`i` is modified and also read/,
    ],
    [
      "int main(void) { int c = 0; int i = 0; return (c && i++) + i; }",
      "i++|i",
      /^undefined behaviour: if `i\+\+` is evaluated, `i` is modified and also read in this expression/,
    ],
    [
      "struct S { int a; int b; }; int main(void) { struct S s = {0, 0}; s.a = s.a++; return 0; }",
      "s.a = s.a++|s.a++",
      /`s\.a` is modified twice/,
    ],
    [
      "int main(void) { int a[2] = {0, 0}; a[0] = a[0]++; return 0; }",
      "a[0] = a[0]++|a[0]++",
      /`a\[0\]` is modified twice/,
    ],
    [
      "struct S { int a; int b; }; int main(void) { struct S s = {0, 0}, t = {1, 2}; return s.a + (s = t).b; }",
      "s = t|s.a",
      /`s` is modified and also read/,
    ],
  ] as const) {
    it(`flags ${source}`, () => {
      const notes = cviz.analyze(source);
      assert.deepEqual(spans(notes), [expected]);
      assert.equal(notes[0].kind, "unsequenced");
      assert.equal(notes[0].phase, "static");
      assert.equal(notes[0].clause, "C17 6.5p2");
      assert.match(notes[0].message, message);
    });
  }

  for (const source of [
    "int main(void) { int i = 0; i++, i++; return i; }",
    "int main(void) { int i = 0; return i++ && i; }",
    "int main(void) { int c = 1; int i = 0; return c ? i++ : i; }",
    "int main(void) { int i = 0; i = (i++, i); return i; }",
    "int f(int v) { return v; } int main(void) { int x = 0; x = f(x++); return x; }",
    "int count; int f(void) { return ++count; } int main(void) { return f() + f(); }",
    "int main(void) { int i = 0; int b[2] = {i++, i++}; return b[0]; }",
    "struct S { int a; int b; }; int main(void) { struct S s = {0, 0}; s.a = s.b++; return 0; }",
    "int main(void) { int a[2] = {0, 0}; a[0] = a[1]++; return 0; }",
    "int main(void) { int a[3] = {0, 0, 0}; int i = 0, j = 1; a[i] = a[j]++; return 0; }",
    "int main(void) { int i = 0; i++; { int i = 5; i++; } return 0; }",
    "int main(void) { int i = 0; int *p = &i; *p = i++; return 0; }",
    "int main(void) { int i = 0; return sizeof(i++) + i; }",
  ]) {
    it(`accepts ${source}`, () => {
      assert.isEmpty(cviz.analyze(source));
    });
  }

  it("seeds a run's log at step 0 and leaves it to the runtime from there", () => {
    const rt = cviz.run(readFileSync("test/b4-static-store-conflicts.c", "utf8"));
    const before = rt.notes.getNotes();
    assert.lengthOf(before, 4);
    before.forEach((n) => {
      assert.equal(n.phase, "static");
      assert.equal(n.firstStep, 0);
    });
    while (rt.exitCode === undefined) rt.next();
    assert.equal(rt.exitCode, 0);
    assert.lengthOf(rt.notes.getNotes(), 4);
  });

  it("a static note does not stop the program, but the runtime fault still does", () => {
    const source = readFileSync("test/b4-static-fault-double-increment.c", "utf8");
    assert.lengthOf(cviz.analyze(source), 1);
    const rt = cviz.run(source);
    assert.lengthOf(rt.notes.getNotes(), 1);
    assert.throws(() => {
      while (rt.exitCode === undefined) rt.next();
    }, /undefined behaviour: 'i' is modified by both/);
  });
});
