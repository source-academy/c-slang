/**
 * Definitions of nodes to do with functions.
 */

import { WasmMemoryLoad } from "~src/translator/wasm-ast/memory";
import {
  WasmStatement,
  WasmAstNode,
  WasmExpression,
} from "~src/translator/wasm-ast/core";
import { WasmDataType } from "~src/translator/wasm-ast/dataTypes";

export type WasmFunctionBodyLine = WasmStatement;

/**
 * Counterprt for PrimarDataTypeMemoryObjectDetails
 */
export interface WasmDataObjectMemoryDetails {
  dataType: WasmDataType;
  offset: number;
  size: number; // size in bytes of the object
}

// since params and return are passed by memory, they do not need to be stored in wasmFunction
export interface WasmFunction extends WasmAstNode {
  type: "Function";
  name: string;
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
  args: WasmMemoryLoad[];
}


export interface WasmReturnStatement extends WasmAstNode {
  type: "ReturnStatement";
}

/**
 * Contains all the information to define a wasm function import.
 */
export interface WasmImportedFunction {
  name: string; // the name defined for this imported function within the wasm module
  importPath: string[]; // import path for function e.g: ["console", "log"]
  wasmParamTypes: WasmDataType[]; // the params of the functions in wasm
  returnWasmTypes: WasmDataType[] | null;
}
