import { readFileSync } from "fs";
import { assert } from "chai";
import { describe, it } from "mocha";
import cviz from "../src/index";
import { Endianness } from "../src/config";
import { bytesToBigint } from "../src/typing/representation";
import { NO_EFFECTIVE_TYPE } from "../src/interpreter/effectiveTypeTable";
import { Type, pointer, voidType } from "../src/typing/types";
import { RuntimeView } from "../src/interpreter/runtime";

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
      const pointerBytes = rt.memory.getBytes(rt.symbolTable.getAddress("unknown"), pointer(voidType()).size);
      const base = Number(bytesToBigint(pointerBytes, false, endianness));
      assert.deepEqual(rt.initTable.getMask(base, 8), [false, true, false, false, false, false, false, false]);
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
      const snapshot = rt.memory.storage.getRanges();
      snapshot[0].size = 0;
      assert.isAbove(rt.memory.storage.getRanges()[0].size, 0);
    });
  }
});
