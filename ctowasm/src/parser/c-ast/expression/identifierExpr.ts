import { CNodeBase } from "~src/parser/c-ast/core";

export default interface IdentifierExpr extends CNodeBase {
  type: "IdentifierExpr";
  name: string; //name of the variable
}
