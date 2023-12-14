/**
 * Defintions of AST nodes to support array features.
 */
import { CNode, Expression } from "~src/c-ast/core";
import { VariableType } from "~src/common/types";

export interface ArrayDeclaration extends CNode {
  type: "ArrayDeclaration" | "ArrayInitialization";
  name: string;
  variableType: VariableType;
  size: number;
}

export interface ArrayInitialization extends ArrayDeclaration {
  type: "ArrayInitialization";
  elements: Expression[];
}

// node for what array element access expression e.g. arr[2]
export interface ArrayElementExpr extends Expression {
  type: "ArrayElementExpr";
  name: string; // name of the array
  index: Expression;
}
