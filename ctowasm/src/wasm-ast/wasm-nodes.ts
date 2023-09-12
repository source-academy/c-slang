/**
 * This file contains all the typescript definitions for the nodes of the wasm AST.
 */
export type WasmType = "i32" | "i64" | "f32" | "f64";

export interface WasmAstNode {
  type: string;
}

export interface WasmVariable extends WasmAstNode {
  name: string; // not technically needed for wasm, but useful
  isConst?: boolean // TODO: to support later on
  variableType: WasmType;
}

export interface WasmLocalVariable extends WasmVariable, WasmAstNode {
  type: "LocalVariable";
}

export interface WasmGlobalVariable extends WasmVariable, WasmAstNode {
  type: "GlobalVariable";
  initializerValue?: WasmConst // initial value to set this global value to
}

export interface WasmConst extends WasmAstNode  {
  type: "Const";
  variableType: WasmType;
  value: number;
}

export interface WasmModule extends WasmAstNode {
  type: "Module";
  globals: WasmGlobalVariable[];
  functions: WasmFunction[];
}

export type WasmFunctionBodyLine = (WasmStatement | WasmExpression);

export interface WasmFunction extends WasmAstNode  {
  type: "Function";
  name: string;
  params: Record<string, WasmVariable>;
  locals: Record<string, WasmVariable>;
  body: WasmFunctionBodyLine[];
  return: WasmType | null;
}

type WasmStatement = WasmGlobalSet | WasmLocalSet;

// TODO: figure out if this necessary
export type WasmExpression =
  | WasmFunctionCall
  | WasmConst
  | WasmLocalGet
  | WasmGlobalGet;

export interface WasmFunctionCall extends WasmAstNode  {
  type: "FunctionCall";
  name: string;
  args: WasmExpression[];
}

// A procedure is a function with no return value
export interface WasmProcedureCall extends WasmAstNode  {
  type: "ProcedureCall";
  name: string;
  args: WasmExpression[];
}

export interface WasmGlobalSet extends WasmAstNode  {
  type: "GlobalSet";
  name: string;
  value: WasmExpression;
}

export interface WasmLocalSet extends WasmAstNode  {
  type: "LocalSet";
  name: string;
  value: WasmExpression;
}

export interface WasmLocalGet extends WasmAstNode  {
  type: "LocalGet";
  name: string;
}

export interface WasmGlobalGet extends WasmAstNode  {
  type: "GlobalGet";
  name: string;
}
