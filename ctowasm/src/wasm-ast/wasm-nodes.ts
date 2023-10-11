import { BinaryOperator, ComparisonOperator } from "c-ast/c-nodes";
import { Scopes } from "wasm-ast/types";

/**
 * This file contains all the typescript definitions for the nodes of the wasm AST.
 */
export type WasmType = "i32" | "i64" | "f32" | "f64";

export interface WasmAstNode {
  type: string;
}

export interface WasmVariable extends WasmAstNode {
  name: string; // not technically needed for wasm, but useful
  isConst?: boolean; // TODO: to support later on
  variableType: WasmType;
}

export interface WasmLocalVariable extends WasmVariable, WasmAstNode {
  type: "LocalVariable";
}

export interface WasmGlobalVariable extends WasmVariable, WasmAstNode {
  type: "GlobalVariable";
  initializerValue?: WasmConst; // initial value to set this global value to
}

export interface WasmConst extends WasmAstNode {
  type: "Const";
  variableType: WasmType;
  value: number;
}

export interface WasmModule extends WasmAstNode {
  type: "Module";
  globals: WasmGlobalVariable[];
  functions: WasmFunction[];
}

export type WasmFunctionBodyLine = WasmStatement | WasmExpression;

export interface WasmFunction extends WasmAstNode {
  type: "Function";
  name: string;
  params: Record<string, WasmVariable>;
  locals: Record<string, WasmVariable>;
  scopes: Scopes;
  body: WasmFunctionBodyLine[];
  return: WasmType | null;
}

export type WasmStatement = WasmGlobalSet | WasmLocalSet | WasmFunctionCallStatement | WasmSelectStatement | WasmReturnStatement;

// TODO: figure out if this necessary
export type WasmExpression =
  | WasmFunctionCall
  | WasmConst
  | WasmLocalGet
  | WasmGlobalGet
  | WasmArithmeticExpression
  | WasmExprStatement
  | WasmBooleanExpression
  | WasmAndExpression
  | WasmOrExpression
  | WasmComparisonExpression;

export interface WasmReturnStatement {
  type: "ReturnStatement";
  value: WasmExpression;
}

export interface WasmFunctionCall extends WasmAstNode {
  type: "FunctionCall";
  name: string;
  args: WasmExpression[];
}

export interface WasmFunctionCallStatement extends WasmAstNode {
  type: "FunctionCallStatement";
  name: string;
  args: WasmExpression[];
  hasReturn: boolean;
}

// A procedure is a function with no return value
export interface WasmProcedureCall extends WasmAstNode {
  type: "ProcedureCall";
  name: string;
  args: WasmExpression[];
}

export interface WasmGlobalSet extends WasmAstNode {
  type: "GlobalSet";
  name: string;
  value: WasmExpression;
}

export interface WasmLocalSet extends WasmAstNode {
  type: "LocalSet";
  name: string;
  value: WasmExpression;
}

export interface WasmLocalGet extends WasmAstNode {
  type: "LocalGet";
  name: string;
  preStatements?: (WasmStatement | WasmExpression)[]; // any statements to run before a local get
}

export interface WasmGlobalGet extends WasmAstNode {
  type: "GlobalGet";
  name: string;
  preStatements?: (WasmStatement | WasmExpression)[];
}

export interface WasmArithmeticExpression extends WasmAstNode {
  type: "ArithmeticExpression";
  operator: BinaryOperator;
  leftExpr: WasmExpression;
  rightExpr: WasmExpression;
  varType: WasmType; // the type of the variables that the arithmetic expression is running
}

/**
 * A special type of statement that results in 1 value being put on the stack,
 * in effect behaving like a WasmExpression.
 *
 * Currently this is only enabled for setting statements, to allowing postfix/prefix operators to work.
 */
export type WasmExprStatement = WasmLocalSet | WasmGlobalSet;

/**
 * Forms a wrapper around a regular wasm expression, to indicate that it is to be
 * used as a boolean expression.
 */
export interface WasmBooleanExpression extends WasmAstNode {
  type: "BooleanExpression";
  expr: WasmExpression;
  isNegated?: boolean; // set to true to negate the boolean value
}

export interface WasmAndExpression extends WasmAstNode {
  type: "AndExpression";
  leftExpr: WasmAndExpression | WasmBooleanExpression;
  rightExpr: WasmBooleanExpression;
}

/**
 * Bitwise OR.
 */
export interface WasmOrExpression extends WasmAstNode {
  type: "OrExpression";
  leftExpr: WasmOrExpression | WasmAndExpression | WasmBooleanExpression;
  rightExpr: WasmAndExpression | WasmBooleanExpression;
}


export interface WasmComparisonExpression {
  type: "ComparisonExpression";
  operator: ComparisonOperator;
  leftExpr: WasmExpression;
  rightExpr: WasmExpression;
}

export interface WasmSelectStatement {
  type: "SelectStatement";
  condition: WasmExpression;
  actions: WasmStatement[];
  elseStatements: WasmStatement[];
}