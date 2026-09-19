import { BIGINT_TO_BYTES } from "../typing/representation";
import { Type, isArray, pointer } from "../typing/types";
import { Stack } from "../utils";
import { FunctionDesignator, TemporaryObject } from "./object";
import { Runtime } from "./runtime";

export type StashItem = TemporaryObject | FunctionDesignator;

export const isTemporaryObject = (i: StashItem): i is TemporaryObject =>
  i instanceof TemporaryObject;

export const isFunctionDesignator = (i: StashItem): i is FunctionDesignator =>
  i instanceof FunctionDesignator;

export class Stash {
  private st: Stack<StashItem>;

  constructor() {
    this.st = new Stack();
  }

  pop(): StashItem {
    return this.st.pop();
  }

  push(rt: Runtime, x: StashItem, addr: number | null = null): void {
    let res: TemporaryObject;
    if (isFunctionDesignator(x)) {
      const addr = BigInt(rt.symbolTable.getAddress(x.identifier));
      res = new TemporaryObject(
        pointer(x.typeInfo),
        BIGINT_TO_BYTES[Type.Pointer](addr, rt.config.endianness),
      );
    } else if (isArray(x.typeInfo)) {
      if (addr === null)
        throw new Error(
          "address should be not null when calling stash push with array",
        );
      res = new TemporaryObject(
        pointer(x.typeInfo.elementType),
        BIGINT_TO_BYTES[Type.Pointer](BigInt(addr), rt.config.endianness),
      );
    } else res = x;
    this.st.push(res);
  }

  pushWithoutConversions(x: StashItem): void {
    this.st.push(x);
  }

  getArr(): StashItem[] {
    return this.st.getArr();
  }
}
