/**
 * Definitions for nodes relating to simple variables (simple types, not arrays or pointer).
 */

import { Expression, CNode } from "~src/c-ast/core";
import { VariableType } from "~src/common/types";

export interface VariableDeclaration extends CNode {
  type: "VariableDeclaration";
  variableType: VariableType;
  name: string;
}

export interface Initialization extends CNode {
  type: "Initialization";
  variableType: VariableType;
  name: string;
  value: Expression;
}

// when a variable is used as expression - e.g. int x = y;
export interface VariableExpr extends Expression {
  type: "VariableExpr";
  name: string; //name of the variable
  variableType: VariableType;
}
