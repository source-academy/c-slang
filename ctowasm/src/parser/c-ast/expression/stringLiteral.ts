import { CNodeBase } from "~src/parser/c-ast/core";

export default interface StringLiteral extends CNodeBase {
  type: "StringLiteral";
  chars: number[]; // the str as an array of chars in numeric form
}
