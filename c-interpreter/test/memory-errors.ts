import { assert } from "chai";
import { describe, it } from "mocha";
import {
  ExecuteSegmentationFault,
  MemoryError,
  PointerProvenanceFault,
  ReadSegmentationFault,
  SegmentationFault,
  StackOverflowError,
  WriteSegmentationFault,
} from "../src/memory/errors";

describe("memory error inheritance", () => {
  for (const [ErrorClass, create, message] of [
    [MemoryError, () => new MemoryError("memory failure"), "memory failure"],
    [
      SegmentationFault,
      () => new SegmentationFault("access 0x00001234"),
      "segmentation fault (tried to access 0x00001234)",
    ],
    [
      ReadSegmentationFault,
      () => new ReadSegmentationFault("0x00001234"),
      "segmentation fault (tried to read 0x00001234)",
    ],
    [
      WriteSegmentationFault,
      () => new WriteSegmentationFault("0x00001234"),
      "segmentation fault (tried to write to 0x00001234)",
    ],
    [
      ExecuteSegmentationFault,
      () => new ExecuteSegmentationFault("0x00001234"),
      "segmentation fault (tried to execute 0x00001234)",
    ],
    [
      StackOverflowError,
      () => new StackOverflowError("exceeded the configured 500000-byte stack at depth 3"),
      "segmentation fault (tried to grow the stack (exceeded the configured 500000-byte stack at depth 3))",
    ],
  ] as const) {
    it(`preserves ${ErrorClass.name}'s prototype chain and message`, () => {
      const error = create();
      assert.instanceOf(error, ErrorClass);
      assert.instanceOf(error, MemoryError);
      assert.instanceOf(error, Error);
      assert.strictEqual(Object.getPrototypeOf(error), ErrorClass.prototype);
      if (ErrorClass !== MemoryError)
        assert.instanceOf(error, SegmentationFault);
      for (const Subtype of [
        ReadSegmentationFault,
        WriteSegmentationFault,
        ExecuteSegmentationFault,
        StackOverflowError,
      ]) {
        if (ErrorClass !== Subtype) assert.notInstanceOf(error, Subtype);
      }
      assert.equal(error.message, message);
      assert.include(error.stack, message);
    });
  }

  it("preserves further subclasses without another prototype repair", () => {
    class ProtectedWriteFault extends WriteSegmentationFault {}
    const error = new ProtectedWriteFault("0x00001234");
    assert.instanceOf(error, ProtectedWriteFault);
    assert.instanceOf(error, WriteSegmentationFault);
    assert.instanceOf(error, SegmentationFault);
    assert.instanceOf(error, MemoryError);
    assert.instanceOf(error, Error);
    assert.strictEqual(
      Object.getPrototypeOf(error),
      ProtectedWriteFault.prototype,
    );
  });

  // PointerProvenanceFault (B3.4) is a MemoryError but deliberately not a
  // SegmentationFault: the address involved is validly mapped to a live
  // object, just not the one the pointer's own arithmetic was derived from.
  it("gives PointerProvenanceFault its own identity, separate from SegmentationFault", () => {
    const error: Error = new PointerProvenanceFault("pointer arithmetic from 'a' produced an address inside the unrelated 'b'");
    const message = error.message;
    const prototype = Object.getPrototypeOf(error);
    assert.instanceOf(error, PointerProvenanceFault);
    assert.instanceOf(error, MemoryError);
    assert.instanceOf(error, Error);
    assert.notInstanceOf(error, SegmentationFault);
    assert.strictEqual(prototype, PointerProvenanceFault.prototype);
    assert.equal(
      message,
      "invalid pointer use: pointer arithmetic from 'a' produced an address inside the unrelated 'b'",
    );
  });
});
