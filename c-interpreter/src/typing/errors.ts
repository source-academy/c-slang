import { PositionInfo } from "../ast/types";

export class TypeCheckingError extends Error {
  readonly line: number;
  readonly column: number;
  readonly offset: number;
  /** The message before `Error`'s own "line X col Y: " prefix was added - needed so a
   * caller translating this error's position (A7.6) can rebuild an equivalent one
   * without re-parsing its own formatted message back apart. */
  readonly rawMessage: string;

  constructor(t: { start: PositionInfo }, msg: string) {
    super("line " + t.start.line + " col " + t.start.column + ": " + msg);
    this.line = t.start.line;
    this.column = t.start.column;
    this.offset = t.start.offset;
    this.rawMessage = msg;
    Object.setPrototypeOf(this, TypeCheckingError.prototype);
  }
}
