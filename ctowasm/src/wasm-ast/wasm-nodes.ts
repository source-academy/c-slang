/**
 * This file contains all the typescript definitions for the nodes of the wasm AST.
 */
type WasmType = "i32" | "i64" | "f32" | "f64";

export interface WasmVariable {
  name: string; // not technically needed for wasm, but useful
  variableType: WasmType;
}

export interface WasmLocalVariable extends WasmVariable {
  type: "LocalVariable";
}

export interface WasmGlobalVariable extends WasmVariable {
  type: "GlobalVariable";
}

export interface WasmConst {
  type: "Const";
  variableType: WasmType;
  value: number;
}

export interface WasmModule {
  type: "Module";
  globals: WasmVariable[];
  functions: WasmFunction[];
}

export interface WasmFunction {
  type: "Function";
  params: WasmVariable[];
  locals: WasmVariable[];
  body: (WasmStatement | WasmExpression)[];
  return: WasmType;
}

type WasmStatement = WasmGlobalSet | WasmLocalSet;

// TODO: figure out if this necessary
type WasmExpression =
  | WasmFunctionCall
  | WasmConst
  | WasmLocalGet
  | WasmGlobalGet;

export interface WasmFunctionCall {
  type: "FunctionCall";
  name: string;
  args: WasmExpression[];
}

// A procedure is a function with no return value
export interface WasmProcedureCall {
  type: "ProcedureCall";
  name: string;
  args: WasmExpression[];
}

export interface WasmGlobalSet {
  type: "GlobalSet";
  name: string;
  value: WasmExpression;
}

export interface WasmLocalSet {
  type: "LocalSet";
  name: string;
  value: WasmExpression;
}

export interface WasmLocalGet {
  type: "LocalGet";
  name: string;
}

export interface WasmGlobalGet {
  type: "GlobalGet";
  name: string;
}
