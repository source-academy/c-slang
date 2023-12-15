/**
 * Definitions for literal expressions.
 */

import { Expression } from "~src/c-ast/core";
import { IntegerType, VariableType } from "~src/common/types";

export interface Constant extends Expression {
  type: "IntegerConstant" | "FloatConstant";
  value: number;
  isConstant: true; // convenience flag
  variableType: VariableType; // to be determined during processing stage. PARSER DOES NOT FILL THIS.
}

export interface IntegerConstant extends Constant {
  type: "IntegerConstant";
  variableType: IntegerType;
  isUnsigned?: boolean; // default should be undefined/false
}

export interface FloatConstant extends Constant {
  type: "FloatConstant";
}
