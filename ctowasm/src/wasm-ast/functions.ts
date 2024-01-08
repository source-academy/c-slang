/**
 * Definitions of nodes to do with functions.
 */

import { WasmMemoryLoad, WasmMemoryVariable } from "~src/wasm-ast/memory";
import { WasmStatement, WasmAstNode, WasmExpression } from "~src/wasm-ast/core";
import { ImportedFunction } from "~src/wasmModuleImports";
import { WasmType } from "~src/wasm-ast/types";
import { DataType } from "~src/parser/c-ast/dataTypes";

export type WasmFunctionBodyLine = WasmStatement | WasmExpression;
export interface WasmFunction extends WasmAstNode {
  type: "Function";
  name: string;
  params: WasmMemoryVariable[]; // ordered array of local variables which correspond to function parameters
  returnDataType: DataType | null; // the return of this function, null if it does not return anything
  sizeOfLocals: number;
  sizeOfParams: number;
  body: WasmStatement[];
}

export interface WasmFunctionCall extends WasmAstNode {
  type: "FunctionCall";
  name: string;
  stackFrameSetup: WasmStatement[]; // wasm statements to set up the stack for this wasm function call (params, and locals)
  stackFrameTearDown: (WasmStatement | WasmMemoryLoad)[]; // statements teardown the stack frame
}

/**
 * Node to represent a function call that is a typical wasm function call - not participating in the logic of the memory model.
 */
export interface WasmRegularFunctionCall extends WasmAstNode {
  type: "RegularFunctionCall";
  name: string;
  args: WasmExpression[];
}

export interface WasmFunctionCallStatement extends WasmAstNode {
  type: "FunctionCallStatement";
  name: string;
  stackFrameSetup: WasmStatement[]; // wasm statements to set up the stack for this wasm function call (params, and locals)
  stackFrameTearDown: (WasmStatement | WasmMemoryLoad)[]; // statements teardown the stack frame
}

/**
 * Node to represent a function call that is a typical wasm function call - not participating in the logic of the memory model.
 */
export interface WasmRegularFunctionCallStatement extends WasmAstNode {
  type: "RegularFunctionCallStatement";
  name: string;
  args: WasmExpression[];
}

export interface WasmReturnStatement extends WasmAstNode {
  type: "ReturnStatement";
}

/**
 * Wasm Imported function with some added information.
 */
export interface WasmImportedFunction extends ImportedFunction {
  wasmParamTypes: WasmType[]; // the params of the functions in wasm
  returnWasmType: WasmType | null;
}
