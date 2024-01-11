import { CNodeBase, Statement } from "~src/parser/c-ast/core";

export default interface Block extends CNodeBase {
  type: "Block";
  statements: Statement[];
}
