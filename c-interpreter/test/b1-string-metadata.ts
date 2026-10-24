import { readFileSync } from "fs";
import { assert } from "chai";
import { describe, it } from "mocha";
import cviz from "../src/index";
import { Endianness } from "../src/config";
import { bytesToBigint } from "../src/typing/representation";
import { NO_EFFECTIVE_TYPE } from "../src/interpreter/effectiveTypeTable";
import { Type, isStructure, pointer, voidType } from "../src/typing/types";
import { Runtime, RuntimeView } from "../src/interpreter/runtime";

const pointerValue = (rt: Runtime, name: string): number => Number(bytesToBigint(
  rt.memory.getBytes(rt.symbolTable.getAddress(name), pointer(voidType()).size), false, rt.config.endianness,
));

export const runFixture = (name: string, endianness: Endianness = "little") => {
  const rt = cviz.run(readFileSync(`test/b1-string-${name}.c`, "utf8"), { endianness });
  while (rt.exitCode === undefined) rt.next();
  assert.equal(rt.exitCode, 0);
  return rt;
};

describe("b1-string storage metadata", () => {
  it("snapshots parameter storage independently of later scope retirement", () => {
    const rt = cviz.run(readFileSync("test/b1-string-storage.c", "utf8"));
    while (!rt.symbolTable.getBlockScopes().some(scope => "parameter" in scope)) rt.next();
    const address = rt.symbolTable.getAddress("parameter");
    const view = new RuntimeView(rt);
    assert.equal(view.memory.storage.find(BigInt(address), BigInt(4))?.kind, "automatic");
    while (rt.exitCode === undefined) rt.next();
    assert.isUndefined(rt.memory.storage.find(BigInt(address), BigInt(4)));
    assert.equal(view.memory.storage.find(BigInt(address), BigInt(4))?.kind, "automatic");
  });
  for (const endianness of ["little", "big"] as const) {
    it(`records static zero initialization (${endianness})`, () => {
      const rt = runFixture("initialization", endianness);
      const base = rt.symbolTable.getAddress("staticZero");
      const initialized = rt.initTable.getTable();
      for (let i = 0; i < 8; i++) assert.isTrue(initialized[base + i]);
    });
    it(`clears stale heap initialization flags on reuse (${endianness})`, () => {
      const rt = runFixture("initialization", endianness);
      const base = pointerValue(rt, "unknown");
      assert.deepEqual(rt.initTable.getMask(base, 8), [false, true, false, false, false, false, false, false]);
      assert.deepEqual(rt.initTable.getMask(pointerValue(rt, "filled"), 8), [false, false, true, true, true, false, false, false]);
      assert.deepEqual(rt.initTable.getMask(pointerValue(rt, "copied"), 8), [true, true, false, true, false, false, true, true]);
      assert.deepEqual(rt.initTable.getMask(pointerValue(rt, "stringCopy"), 8), [true, true, true, false, false, false, false, false]);
    });
    it(`copies member flags without initializing padding (${endianness})`, () => {
      const rt = runFixture("initialization", endianness);
      const base = rt.symbolTable.getAddress("padded");
      const type = rt.effectiveTypeTable.get(base);
      if (type === NO_EFFECTIVE_TYPE || !isStructure(type)) throw new Error("expected declared struct");
      const expected = Array<boolean>(type.size).fill(false);
      for (const member of type.members)
        expected.fill(true, member.relativeAddress, member.relativeAddress + member.type.size);
      assert.include(expected, false, "fixture must exercise padding");
      assert.deepEqual(rt.initTable.getMask(base, type.size), expected);
      assert.deepEqual(rt.initTable.getMask(pointerValue(rt, "paddingCopy"), type.size), expected);
    });
    it(`leaves source bytes and masks unchanged during copies (${endianness})`, () => {
      const rt = cviz.run(readFileSync("test/b1-string-initialization.c", "utf8"), { endianness });
      let observed = false;
      while (rt.exitCode === undefined) {
        const scope = rt.symbolTable.getBlockScopes().find(s => "source" in s);
        const range = scope && rt.memory.storage.find(BigInt(scope.source), BigInt(1));
        const before = range && rt.initTable.getMask(range.base, range.size);
        const bytes = range && rt.memory.getBytes(range.base, range.size);
        rt.next();
        // Once the member stores finish, later copy calls only read this object.
        if (range && before?.[0] && before[range.size - 1] && rt.memory.storage.find(BigInt(range.base), BigInt(1))) {
          assert.deepEqual(rt.initTable.getMask(range.base, range.size), before);
          assert.deepEqual(rt.memory.getBytes(range.base, range.size), bytes);
          observed = true;
        }
      }
      assert.isTrue(observed);
    });
    it(`retires automatic ranges across returns and loop exits (${endianness})`, () => {
      const rt = runFixture("storage", endianness);
      assert.isEmpty(rt.memory.storage.getRanges().filter(r => r.kind === "automatic" || r.kind === "allocated"));
      assert.isEmpty(rt.initTable.getTable());
    });
    it(`replaces inferred types and preserves untyped allocation coverage (${endianness})`, () => {
      const rt = runFixture("effective-types", endianness);
      const [allocation] = rt.memory.storage.getRanges().filter(r => r.kind === "allocated");
      const type = rt.effectiveTypeTable.get(allocation.base);
      assert.notEqual(type, NO_EFFECTIVE_TYPE);
      if (type !== NO_EFFECTIVE_TYPE) assert.equal(type.type, Type.Float);
      assert.equal(rt.effectiveTypeTable.get(allocation.base + 4), NO_EFFECTIVE_TYPE);
      const cleared = pointerValue(rt, "cleared");
      assert.deepEqual(rt.effectiveTypeTable.getTypes(cleared), [NO_EFFECTIVE_TYPE]);
      assert.isTrue(rt.memory.storage.find(BigInt(cleared), BigInt(4))?.kind === "allocated");
      const snapshot = rt.memory.storage.getRanges();
      snapshot[0].size = 0;
      assert.isAbove(rt.memory.storage.getRanges()[0].size, 0);
      assert.deepEqual(rt.effectiveTypeTable.getTypes(pointerValue(rt, "partial")), [NO_EFFECTIVE_TYPE]);
      const atPartialByte = rt.effectiveTypeTable.get(pointerValue(rt, "partial") + 1);
      assert.notEqual(atPartialByte, NO_EFFECTIVE_TYPE);
      if (atPartialByte !== NO_EFFECTIVE_TYPE) assert.equal(atPartialByte.type, Type.UnsignedChar);
      const unionTypes = rt.effectiveTypeTable.getTypes(pointerValue(rt, "copiedUnion"));
      assert.includeMembers(unionTypes.filter(t => t !== NO_EFFECTIVE_TYPE).map(t => t.type),
        [Type.Structure, Type.Int, Type.Float, Type.Array, Type.UnsignedChar]);
      const declared = rt.effectiveTypeTable.get(rt.symbolTable.getAddress("declared"));
      if (declared === NO_EFFECTIVE_TYPE) throw new Error("declared type lost");
      assert.equal(declared.type, Type.Int);
    });
  }
});
