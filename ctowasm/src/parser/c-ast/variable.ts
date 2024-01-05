/**
 * Definitions for nodes relating to simple variables (simple types, not arrays or pointer).
 */

import { Expression, CNodeBase } from "~src/parser/c-ast/core";
import { DataType } from "~src/common/types";
import { UnaryExpressionBase } from "./unaryExpression";

export interface VariableDeclaration extends CNodeBase {
  type: "VariableDeclaration";
  dataType: DataType;
  name: string;
}

export interface Initialization extends CNodeBase {
  type: "Initialization";
  dataType: DataType;
  name: string;
  initializer: Initializer;
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

// An lvalue expr is one that can be assigned to - it has a defined allocated space in memory
export type LValue = VariableExpr | ArrayElementExpr;

// when a variable is used as expression - e.g. int x = y;
export interface VariableExpr extends CNodeBase {
  type: "VariableExpr";
  name: string; //name of the variable
}

// node for what array element access expression e.g. arr[2]
export interface ArrayElementExpr extends UnaryExpressionBase {
  type: "ArrayElementExpr";
  index: Expression;
}
