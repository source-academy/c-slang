export class MemoryError extends Error {
  constructor(msg: string) {
    super(msg);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class SegmentationFault extends MemoryError {
  constructor(e: string) {
    super("segmentation fault (tried to " + e + ")");
  }
}

// Each takes an already-built explanation of the address involved (see
// explainFault.ts), not a bare address - that's what lets the message name the
// object/offset/free-site instead of just the hex address.
export class ReadSegmentationFault extends SegmentationFault {
  constructor(explanation: string) {
    super("read " + explanation);
  }
}

export class WriteSegmentationFault extends SegmentationFault {
  constructor(explanation: string) {
    super("write to " + explanation);
  }
}

export class ExecuteSegmentationFault extends SegmentationFault {
  constructor(explanation: string) {
    super("execute " + explanation);
  }
}

export class StackOverflowError extends SegmentationFault {
  constructor(explanation: string) {
    super("grow the stack (" + explanation + ")");
  }
}

// Not a SegmentationFault: the address involved is validly mapped to a live
// object, just not the one a pointer's own arithmetic was derived from (B3.4 -
// a scoped subset of pointer provenance, not full tracking).
export class PointerProvenanceFault extends MemoryError {
  constructor(explanation: string) {
    super("invalid pointer use: " + explanation);
  }
}
