/**
 * Definitions of nodes to do with functions.
 */

import {
  WasmLocalVariable,
  WasmMemoryVariable,
  WasmMemoryLoad,
  WasmReturnVariable,
} from "~src/wasm-ast/memory";
import { WasmStatement, WasmExpression, WasmAstNode } from "~src/wasm-ast/core";
import { ImportedFunction } from "~src/wasmModuleImports";
import { WasmType } from "~src/wasm-ast/types";

export type WasmFunctionBodyLine = WasmStatement | WasmExpression;
/**
 * Some type definitions for non-node objects.
 */

// Nested Symbol Table
// global scope -> function parameter scope -> function body scope -> block scope (if available)
export interface WasmSymbolTable {
  parentTable: WasmSymbolTable | null;
  currOffset: { value: number }; // current offset saved as "value" in an object. Used to make it sharable as a reference across tables
  variables: Record<string, WasmMemoryVariable>;
}

export interface WasmFunction extends WasmAstNode {
  type: "Function";
  name: string;
  params: WasmLocalVariable[]; // ordered array of local variables which correspond to function parameters
  returnVariable: WasmReturnVariable | null; // the return of this function, null if it does not return anything
  sizeOfLocals: number;
  sizeOfParams: number;
  body: WasmStatement[];
}

export interface WasmFunctionCall extends WasmExpression {
  type: "FunctionCall";
  name: string;
  stackFrameSetup: WasmStatement[]; // wasm statements to set up the stack for this wasm function call (params, and locals)
  stackFrameTearDown: (WasmStatement | WasmMemoryLoad)[]; // statements teardown the stack frame
}

/**
 * Node to represent a function call that is a typical wasm function call - not participating in the logic of the memory model.
 */
export interface WasmRegularFunctionCall extends WasmExpression {
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

export interface WasmReturnStatement {
  type: "ReturnStatement";
}

/**
 * Wasm Imported function with some added information.
 */
export interface WasmImportedFunction extends ImportedFunction {
  wasmParamTypes: WasmType[] // the params of the functions in wasm
  returnWasmType: WasmType | null;
}
