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

type WasmStatement = WasmGlobalSet | WasmLocalSet | WasmFunctionCallStatement;

// TODO: figure out if this necessary
export type WasmExpression =
  | WasmFunctionCall
  | WasmConst
  | WasmLocalGet
  | WasmGlobalGet
  | WasmAddExpression
  | WasmSubtractExpression
  | WasmMultiplyExpression
  | WasmDivideExpression
  | WasmRemainderExpression
  | WasmExprStatement;

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
  leftExpr: WasmExpression;
  rightExpr: WasmExpression;
  varType: WasmType; // the type of the variables that the arithmetic expression is running
}

export interface WasmAddExpression extends WasmArithmeticExpression {
  type: "AddExpression";
}

export interface WasmSubtractExpression extends WasmArithmeticExpression {
  type: "SubtractExpression";
}

export interface WasmMultiplyExpression extends WasmArithmeticExpression {
  type: "MultiplyExpression";
}

export interface WasmDivideExpression extends WasmArithmeticExpression {
  type: "DivideExpression";
}

export interface WasmRemainderExpression extends WasmArithmeticExpression {
  type: "RemainderExpression";
}

/**
 * A special type of statement that results in 1 value being put on the stack,
 * in effect behaving like a WasmExpression.
 * 
 * Currently this is only enabled for setting statements, to allowing postfix/prefix operators to work.
 */
export type WasmExprStatement = WasmLocalSet | WasmGlobalSet;