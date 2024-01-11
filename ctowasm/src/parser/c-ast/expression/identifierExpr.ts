import { CNodeBase } from "~src/parser/c-ast/core";

export default interface IdentifierExpression extends CNodeBase {
  type: "IdentifierExpression";
  name: string; //name of the variable
}
