import { readFileSync } from "fs";
import { assert } from "chai";
import { describe, it } from "mocha";
import cviz from "../src/index";
import { Endianness } from "../src/config";
import { Note } from "../src/interpreter/notes";

const run = (name: string, endianness: Endianness): Note[] => {
  const rt = cviz.run(readFileSync(`test/b4-string-identity-${name}.c`, "utf8"), { endianness });
  while (rt.exitCode === undefined) rt.next();
  assert.equal(rt.exitCode, 0);
  const notes = rt.notes.getNotes();
  notes.forEach((n) => {
    assert.equal(n.kind, "string-literal-identity");
    assert.equal(n.clause, "C17 6.4.5p7");
  });
  return notes;
};

const spans = (notes: Note[]) => notes.map((n) => n.ranges.map((r) => r.src).join("|"));

describe("B4.4 string literal identity notes", () => {
  for (const endianness of ["little", "big"] as const) {
    describe(endianness, () => {
      it("notes a direct comparison of two identical literals", () => {
        const notes = run("direct", endianness);
        assert.deepEqual(spans(notes), ['"abc" == "abc"']);
        assert.match(notes[0].message, /unspecified whether the identical string literals "abc" and "abc" share storage/);
        assert.match(notes[0].message, /this comparison is false/);
        assert.match(notes[0].message, /makes it true/);
      });

      it("notes the same comparison through pointer variables, for == and !=", () => {
        const notes = run("variables", endianness);
        assert.deepEqual(spans(notes), ["a == b", "a != b"]);
        assert.match(notes[0].message, /this comparison is false.*makes it true/);
        assert.match(notes[1].message, /this comparison is true.*makes it false/);
      });

      it("raises nothing when both pointers come from one literal occurrence", () => {
        assert.isEmpty(run("same-occurrence", endianness));
      });

      it("raises nothing for literals no permitted layout could make equal", () => {
        assert.isEmpty(run("different", endianness));
      });

      it("notes a literal that could be the tail of another", () => {
        const notes = run("suffix", endianness);
        assert.deepEqual(spans(notes), ['p == "bc"']);
        assert.match(notes[0].message, /whether the string literal "bc" shares storage with the tail of "abc"/);
      });

      it("notes literal pointers that arrived through parameters, since B3.4's tag survives binding", () => {
        const notes = run("through-call", endianness);
        assert.deepEqual(spans(notes), ["a == b"]);
        assert.equal(notes[0].count, 1);
      });
    });
  }
});
