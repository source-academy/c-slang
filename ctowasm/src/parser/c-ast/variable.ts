/**
 * Definitions for nodes relating to simple variables (simple types, not arrays or pointer).
 */

import { Expression, CNodeBase, CNode } from "~src/parser/c-ast/core";
import { DataType } from "~src/parser/c-ast/dataTypes";
import { UnaryExpressionBase } from "./unaryExpression";

export interface Declaration extends CNodeBase {
  type: "Declaration";
  dataType: DataType;
  name: string;
  initializer?: Initializer; // a declaration may be optionally initialized
}

export type Initializer = InitializerList | InitializerSingle;

export interface InitializerList extends CNodeBase {
  type: "InitializerList";
  values: Initializer[];
}

export interface InitializerSingle extends CNodeBase {
  type: "InitializerSingle";
  value: Expression;
}

/**
 * LValues are expressions which refer to allocated spaces in memory.
 * TODO: add pointer dereferencing
 */
export type LValue = VariableExpr;

const lValues = new Set(["VariableExpr", "ArrayElementExpr"]);

/**
 * Simple utility function to check that a node represents an LValue.
 */
export function isLValue(node: CNode) {
  return node.type in lValues;
}

// when a variable is used as expression - e.g. int x = y;
export interface VariableExpr extends CNodeBase {
  type: "VariableExpr";
  name: string; //name of the variable
}

// node for what array element access expression
export interface ArrayElementExpr extends UnaryExpressionBase {
  type: "ArrayElementExpr";
  index: Expression;
  expr: ArrayElementExpr;
}
