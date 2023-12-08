/**
 * Defintions of AST nodes to support array features.
 */

import { ScopedNode, Expression } from "~src/c-ast/root";
import { VariableType } from "~src/common/types";

export interface ArrayDeclaration extends ScopedNode {
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
  arrayName: string; // name of the array
  variableType: VariableType;
  index: Expression;
}
