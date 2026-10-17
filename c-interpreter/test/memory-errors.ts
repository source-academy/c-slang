import { assert } from "chai";
import { describe, it } from "mocha";
import {
  ExecuteSegmentationFault,
  MemoryError,
  ReadSegmentationFault,
  SegmentationFault,
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
      () => new ReadSegmentationFault(0x1234),
      "segmentation fault (tried to read 0x00001234)",
    ],
    [
      WriteSegmentationFault,
      () => new WriteSegmentationFault(0x1234),
      "segmentation fault (tried to write to 0x00001234)",
    ],
    [
      ExecuteSegmentationFault,
      () => new ExecuteSegmentationFault(0x1234),
      "segmentation fault (tried to execute 0x00001234)",
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
      ]) {
        if (ErrorClass !== Subtype) assert.notInstanceOf(error, Subtype);
      }
      assert.equal(error.message, message);
      assert.include(error.stack, message);
    });
  }

  it("preserves further subclasses without another prototype repair", () => {
    class ProtectedWriteFault extends WriteSegmentationFault {}
    const error = new ProtectedWriteFault(0x1234);
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
});
