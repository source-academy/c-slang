import { assert } from "chai";
import { describe, it } from "mocha";
import cviz from "../src/index";
import { NoteLog, NoteSpec } from "../src/interpreter/notes";
import { RuntimeView } from "../src/interpreter/runtime";

const span = (offset: number, src: string) => ({
  start: { offset, line: 1, column: offset + 1 },
  end: { offset: offset + src.length, line: 1, column: offset + src.length + 1 },
  src,
});

const spec = (overrides: Partial<NoteSpec> = {}): NoteSpec => ({
  kind: "implementation-defined",
  phase: "runtime",
  message: "converting 200 to signed char",
  clause: "C17 6.3.1.3p3",
  ranges: [span(4, "200")],
  ...overrides,
});

const PROGRAM = "int main(void) { int i = 0; i = i + 1; return i; }";

describe("B4.1 notes channel", () => {
  it("merges repeats of one note into a count with first and last steps", () => {
    const log = new NoteLog();
    log.add(spec(), 3);
    log.add(spec({ message: "a later value's message is not kept" }), 7);
    log.add(spec(), 9);
    const notes = log.getNotes();
    assert.lengthOf(notes, 1);
    assert.deepInclude(notes[0], {
      count: 3,
      firstStep: 3,
      lastStep: 9,
      message: "converting 200 to signed char",
    });
  });

  it("keeps notes apart by kind, span, clause and detail", () => {
    const log = new NoteLog();
    log.add(spec(), 1);
    log.add(spec({ kind: "unspecified-order" }), 1);
    log.add(spec({ ranges: [span(10, "300")] }), 1);
    log.add(spec({ clause: "C17 6.5.7p5" }), 1);
    log.add(spec({ detail: "parameter 2" }), 1);
    log.add(spec({ ranges: [] }), 1);
    assert.lengthOf(log.getNotes(), 6);
  });

  it("snapshots keep the counts they were taken with", () => {
    const rt = cviz.run(PROGRAM);
    rt.notes.add(spec(), rt.stepCount);
    const before = new RuntimeView(rt);
    rt.next();
    rt.notes.add(spec(), rt.stepCount);
    const after = new RuntimeView(rt);
    assert.equal(before.notes[0].count, 1);
    assert.equal(after.notes[0].count, 2);
    assert.equal(after.notes[0].lastStep, 1);
    before.notes[0].count = 99;
    assert.equal(rt.notes.getNotes()[0].count, 2);
  });

  it("numbers steps the way the sandbox indexes its views", () => {
    const rt = cviz.run(PROGRAM);
    const views = [new RuntimeView(rt)];
    while (rt.exitCode === undefined) {
      rt.next();
      views.push(new RuntimeView(rt));
    }
    views.forEach((view, i) => assert.equal(view.stepCount, i));
    rt.notes.add(spec(), rt.stepCount);
    assert.equal(rt.notes.getNotes()[0].firstStep, views.length - 1);
  });

  it("a program that raises no notes has an empty log", () => {
    const rt = cviz.run(PROGRAM);
    while (rt.exitCode === undefined) rt.next();
    assert.equal(rt.exitCode, 1);
    assert.isEmpty(rt.notes.getNotes());
    assert.isEmpty(new RuntimeView(rt).notes);
  });
});
