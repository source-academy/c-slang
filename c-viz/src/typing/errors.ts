import { BaseNode } from "../ast/types";

export class TypeCheckingError extends Error {
  readonly line: number;
  readonly column: number;

  constructor(t: BaseNode, msg: string) {
    super("line " + t.start.line + " col " + t.start.column + ": " + msg);
    this.line = t.start.line;
    this.column = t.start.column;
    Object.setPrototypeOf(this, TypeCheckingError.prototype);
  }
}
