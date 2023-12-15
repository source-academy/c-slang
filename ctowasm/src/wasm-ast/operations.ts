/**
 * Definitions of wasm AST nodes to do with operations (arithmetic, boolean etc).
 */

import { BinaryOperator, ComparisonOperator } from "~src/common/constants";
import { WasmType } from "~src/wasm-ast/types";
import { WasmAstNode, WasmExpression } from "~src/wasm-ast/core";

export interface WasmArithmeticExpression extends WasmExpression {
  type: "ArithmeticExpression";
  operator: BinaryOperator;
  leftExpr: WasmExpression;
  rightExpr: WasmExpression;
  varType: WasmType; // the type of the variables that the arithmetic expression is running
}

/**
 * Forms a wrapper around a regular wasm expression, to indicate that it is to be
 * used as a boolean expression.
 */
export interface WasmBooleanExpression extends WasmExpression {
  type: "BooleanExpression";
  expr: WasmExpression;
  isNegated?: boolean; // set to true to negate the boolean value
}

export interface WasmAndExpression extends WasmExpression {
  type: "AndExpression";
  leftExpr: WasmAndExpression | WasmBooleanExpression;
  rightExpr: WasmBooleanExpression;
}

/**
 * Bitwise OR.
 */
export interface WasmOrExpression extends WasmExpression {
  type: "OrExpression";
  leftExpr: WasmOrExpression | WasmAndExpression | WasmBooleanExpression;
  rightExpr: WasmAndExpression | WasmBooleanExpression;
}

export interface WasmComparisonExpression extends WasmExpression {
  type: "ComparisonExpression";
  operator: ComparisonOperator;
  leftExpr: WasmExpression;
  rightExpr: WasmExpression;
}
