import { readFileSync } from "fs";
import { assert } from "chai";
import { describe, it } from "mocha";
import cviz from "../src/index";
import { Endianness } from "../src/config";
import { Note } from "../src/interpreter/notes";

const run = (name: string, endianness: Endianness): Note[] => {
  const rt = cviz.run(readFileSync(`test/b4-conversion-${name}.c`, "utf8"), { endianness });
  while (rt.exitCode === undefined) rt.next();
  assert.equal(rt.exitCode, 0);
  return rt.notes.getNotes();
};

const spans = (notes: Note[]) => notes.map((n) => n.ranges.map((r) => r.src).join("|"));

describe("B4.2 implementation-defined conversion notes", () => {
  for (const endianness of ["little", "big"] as const) {
    describe(endianness, () => {
      it("notes an out-of-range conversion to signed char, naming both values", () => {
        const notes = run("signed-char", endianness);
        assert.lengthOf(notes, 1);
        const [note] = notes;
        assert.equal(note.kind, "implementation-defined");
        assert.equal(note.phase, "runtime");
        assert.equal(note.clause, "C17 6.3.1.3p3");
        assert.match(note.message, /converting 200 to signed char is implementation-defined/);
        assert.match(note.message, /keeps the low 8 bits, giving -56/);
        assert.deepEqual(spans(notes), ["200"]);
        assert.isAbove(note.firstStep, 0);
        assert.equal(note.count, 1);
      });

      it("says that plain char is signed here", () => {
        const notes = run("plain-char", endianness);
        assert.lengthOf(notes, 1);
        assert.match(notes[0].message, /converting 200 to char is .*char is signed here, 6\.2\.5p15.*giving -56/);
      });

      it("raises nothing for unsigned, in-range and floating conversions", () => {
        assert.isEmpty(run("in-range", endianness));
      });

      it("notes store-back truncation from ++, -- and compound assignment", () => {
        const notes = run("store-back", endianness);
        assert.deepEqual(spans(notes), ["++", "d += 1", "--e"]);
        assert.match(notes[0].message, /converting 128 to signed char .*giving -128/);
        assert.match(notes[1].message, /converting 128 to signed char .*giving -128/);
        assert.match(notes[2].message, /converting -129 to signed char .*giving 127/);
        notes.forEach((n) => assert.equal(n.count, 1));
      });

      it("notes a right shift of a negative value, not of a positive or unsigned one", () => {
        const notes = run("shift", endianness);
        assert.deepEqual(spans(notes), ["x >> 1", "w >>= 2"]);
        notes.forEach((n) => assert.equal(n.clause, "C17 6.5.7p5"));
        assert.match(notes[0].message, /right-shifting the negative value -8 is implementation-defined .*giving -4/);
        assert.match(notes[1].message, /right-shifting the negative value -8 .*giving -2/);
      });

      it("notes pointer/integer casts but not a null pointer constant", () => {
        const notes = run("pointer-casts", endianness);
        assert.deepEqual(spans(notes), ["(long)&x", "(int *)p"]);
        assert.equal(notes[0].clause, "C17 6.3.2.3p6");
        assert.match(notes[0].message, /converting a pointer to long is implementation-defined .*address 0x[0-9A-F]+/);
        assert.equal(notes[1].clause, "C17 6.3.2.3p5");
        assert.match(notes[1].message, /converting the integer \d+ to pointer to int is implementation-defined/);
      });

      it("merges a truncation repeated in a loop into one counted note", () => {
        const notes = run("loop", endianness);
        assert.lengthOf(notes, 1);
        assert.equal(notes[0].count, 10);
        assert.isBelow(notes[0].firstStep, notes[0].lastStep);
        assert.match(notes[0].message, /converting 200 to signed char/);
        assert.deepEqual(spans(notes), ["200 + i"]);
      });

      it("notes conversions at argument passing and at return", () => {
        const notes = run("call-boundary", endianness);
        assert.deepEqual(spans(notes), ["200", "300"]);
        assert.match(notes[0].message, /converting 200 to signed char .*giving -56/);
        assert.match(notes[1].message, /converting 300 to signed char .*giving 44/);
      });
    });
  }
});
