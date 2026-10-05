import { readFileSync } from "fs";
import { assert } from "chai";
import { describe, it } from "mocha";
import cviz from "../src/index";
import { Endianness } from "../src/config";
import { isTemporaryObject } from "../src/interpreter/stash";
import { isPointer, isStructure } from "../src/typing/types";

describe("member access agenda", () => {
  for (const file of [
    "member-address-matrix.c",
    "member-address-nested.c",
    "member-address-side-effects.c",
    "const-aggregate-array-reads.c",
  ])
    it(`selects lvalue members using their containing object's address: ${file}`, () => {
      const source = readFileSync(`test/${file}`, "utf8");
      for (const endianness of ["little", "big"] as Endianness[]) {
        const rt = cviz.run(source, { endianness });
        let valueAccesses = 0;
        for (let step = 0; step < 10000 && rt.exitCode === undefined; step++) {
          const next = rt.agenda.peek();
          if (next.type === "StructMember") {
            const stash = rt.stash.getArr();
            const base = stash[stash.length - 1];
            if (!isTemporaryObject(base))
              throw new Error("missing member base");
            assert.isTrue(
              isPointer(base.typeInfo) &&
                isStructure(base.typeInfo.referencedType),
              `expected the containing object's address at ${next.start.line}:${next.start.column}`,
            );
            if (!rt.agenda.topIsLvalue()) valueAccesses++;
          }
          rt.next();
        }
        assert.isDefined(rt.exitCode, "program did not terminate");
        assert.isAbove(valueAccesses, 0, "expected a member read");
      }
    });

  it("selects members of non-lvalue struct results from the temporary value", () => {
    const source = readFileSync("test/member-temporary-values.c", "utf8");
    for (const endianness of ["little", "big"] as Endianness[]) {
      const rt = cviz.run(source, { endianness });
      let temporaryAccesses = 0;
      for (let step = 0; step < 10000 && rt.exitCode === undefined; step++) {
        const next = rt.agenda.peek();
        if (next.type === "StructMember") {
          const stash = rt.stash.getArr();
          const base = stash[stash.length - 1];
          if (!isTemporaryObject(base)) throw new Error("missing member base");
          if (isStructure(base.typeInfo)) {
            assert.isFalse(rt.agenda.topIsLvalue());
            temporaryAccesses++;
          }
        }
        rt.next();
      }
      assert.equal(rt.exitCode, 1);
      assert.equal(temporaryAccesses, 5);
    }
  });
});
