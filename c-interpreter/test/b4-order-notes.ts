import { readFileSync } from "fs";
import { assert } from "chai";
import { describe, it } from "mocha";
import cviz from "../src/index";
import { Endianness } from "../src/config";
import { Note } from "../src/interpreter/notes";
import { RuntimeView } from "../src/interpreter/runtime";
import { isASTNode } from "../src/interpreter/agenda";

const run = (name: string, endianness: Endianness): Note[] => {
  const rt = cviz.run(readFileSync(`test/b4-order-${name}.c`, "utf8"), { endianness });
  while (rt.exitCode === undefined) rt.next();
  assert.equal(rt.exitCode, 0);
  const notes = rt.notes.getNotes();
  notes.forEach((n) => assert.equal(n.kind, "unspecified-order"));
  return notes;
};

const spans = (notes: Note[]) => notes.map((n) => n.ranges.map((r) => r.src.trim()).join("|"));

describe("B4.5 unspecified evaluation order notes", () => {
  for (const endianness of ["little", "big"] as const) {
    describe(endianness, () => {
      it("notes two operands that both modify one object through calls", () => {
        const notes = run("operands", endianness);
        assert.deepEqual(spans(notes), ["next()|next()"]);
        const [note] = notes;
        assert.equal(note.clause, "C17 6.5p3");
        assert.match(note.message, /order of the operands of `-` unspecified/);
        assert.match(note.message, /evaluated the left operand `next\(\)` first/);
        assert.match(note.message, /both modified 'count'/);
        assert.match(note.message, /another compiler can give a different result/);
      });

      it("notes two arguments that both modify one object", () => {
        const notes = run("arguments", endianness);
        assert.deepEqual(spans(notes), ["next()|next()"]);
        assert.equal(notes[0].clause, "C17 6.5.2.2p10");
        assert.match(notes[0].message, /order of a call's arguments unspecified/);
        assert.match(notes[0].message, /argument 1 `next\(\)` and argument 2 `next\(\)` both modified 'count'/);
      });

      it("notes two operands that both print", () => {
        const notes = run("output", endianness);
        assert.deepEqual(spans(notes), ["show(1)|show(2)"]);
        assert.match(notes[0].message, /both printed output, so the printed order depends on this choice/);
      });

      it("notes initializer-list elements as unspecified even when both modify directly", () => {
        const notes = run("initializers", endianness);
        assert.deepEqual(spans(notes), ["next()|next()", "i++|i++"]);
        notes.forEach((n) => {
          assert.equal(n.clause, "C17 6.7.9p23");
          assert.match(n.message, /order of initializer-list elements unspecified/);
          assert.match(n.message, /element 1 .* and element 2 .* both modified/);
        });
      });

      it("names the object down to the array element or member, for a read against a write in a call", () => {
        const notes = run("read-vs-write", endianness);
        assert.deepEqual(spans(notes), ["g|bump()", "arr[2]|bump()", "s.y|bump()"]);
        assert.match(notes[0].message, /the right operand `bump\(\)` modified 'g' and the left operand `g` read it/);
        assert.match(notes[1].message, /`bump\(\)` modified 'arr\[2\]' and the left operand `arr\[2\]` read it/);
        assert.match(notes[2].message, /`bump\(\)` modified 's\.y' and the left operand `s\.y` read it/);
      });

      it("raises nothing for different objects, members, recursion, or reused stack addresses", () => {
        assert.isEmpty(run("no-false-positives", endianness));
      });
    });
  }

  it("dates a note to the step that broke the construct down, where the order was chosen", () => {
    const rt = cviz.run(readFileSync("test/b4-order-operands.c", "utf8"));
    let breakdown = -1;
    while (rt.exitCode === undefined) {
      const top = rt.agenda.peek();
      const isTarget = isASTNode(top) && top.type === "BinaryExpr" && top.src.trim() === "next() - next()";
      rt.next();
      if (isTarget) {
        breakdown = rt.stepCount;
        // The order is applied here, but whether it mattered is not known yet.
        assert.isEmpty(rt.notes.getNotes());
      }
    }
    assert.isAbove(breakdown, 0);
    const [note] = rt.notes.getNotes();
    assert.equal(note.firstStep, breakdown);
    assert.equal(note.lastStep, breakdown);
  });

  it("a snapshot's memory does not feed the live tracker", () => {
    const rt = cviz.run(readFileSync("test/b4-order-operands.c", "utf8"));
    assert.isFunction(rt.memory.accessObserver);
    const view = new RuntimeView(rt);
    assert.isNull(view.memory.accessObserver);
  });
});
