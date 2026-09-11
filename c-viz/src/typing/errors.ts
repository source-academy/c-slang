import { BaseNode } from "../ast/types";

export class TypeCheckingError extends Error {
  constructor(t: BaseNode, msg: string) {
    super("line " + t.start.line + " col " + t.start.column + ": " + msg);
    Object.setPrototypeOf(this, TypeCheckingError.prototype);
  }
}
