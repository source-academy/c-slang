import { cloneDeep } from "lodash";

export class Stack<T> {
  private arr: T[] = [];

  size(): number {
    return this.arr.length;
  }

  isEmpty(): boolean {
    return this.size() === 0;
  }

  pop(): T {
    if (this.isEmpty()) throw new RangeError("pop from empty stack");
    return this.arr.pop() as T;
  }

  push(x: T): void {
    this.arr.push(x);
  }

  peek(): T {
    if (this.isEmpty()) throw new RangeError("peek at empty stack");
    return this.arr[this.size() - 1];
  }

  getArr(): T[] {
    return cloneDeep(this.arr);
  }
}

// rounds n up to the nearest multiple of m
export function roundUpM(n: number, m: number) {
  return Math.ceil(n / m) * m;
}

type ErrorWithMessage = {
  message: string;
};

function isErrorWithMessage(error: unknown): error is ErrorWithMessage {
  return (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as Record<string, unknown>).message === "string"
  );
}

function toErrorWithMessage(maybeError: unknown): ErrorWithMessage {
  if (isErrorWithMessage(maybeError)) return maybeError;

  try {
    return new Error(JSON.stringify(maybeError));
  } catch {
    // fallback in case there's an error stringifying the maybeError
    // like with circular references for example.
    return new Error(String(maybeError));
  }
}

export function getErrorMessage(error: unknown) {
  return toErrorWithMessage(error).message;
}

export function checkValidByte(i: number) {
  if (Number.isInteger(i) && 0 <= i && i < 1 << 8) return;
  throw (
    "invalid byte " +
    i +
    " provided, expected a non-negative integer in [0, 2^8)"
  );
}

export function mod(a: bigint, b: bigint): bigint {
  return ((a % b) + b) % b;
}

export function decimalAddressToHex(addr: number) {
  return "0x" + ("00000000" + addr.toString(16).toUpperCase()).slice(-8);
}
