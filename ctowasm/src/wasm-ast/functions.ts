import {
  WasmFunctionParameter,
  WasmLocalVariable,
  WasmLocalArray,
  WasmMemoryVariable,
  WasmMemoryLoad,
} from "~src/wasm-ast/memory";
import { WasmScopes } from "~src/wasm-ast/types";
import { WasmStatement, WasmExpression, WasmAstNode } from "~src/wasm-ast/core";

/**
 * Definitions of nodes to do with functions.
 */
export type WasmFunctionBodyLine = WasmStatement | WasmExpression;

export interface WasmFunction extends WasmAstNode {
  type: "Function";
  name: string;
  params: Record<string, WasmFunctionParameter>;
  locals: Record<string, WasmLocalVariable | WasmLocalArray>;
  returnVariable: WasmMemoryVariable | null; // the return of this function, null if it does not return anything
  sizeOfLocals: number;
  sizeOfParams: number;
  loopCount: number; // count of the loops in this function. used for giving unique label names to loops
  blockCount: number; // same as loopCount, but for WasmBlocks
  scopes: WasmScopes;
  body: WasmFunctionBodyLine[];
  bpOffset: number; // current offset from base pointer, initially 0
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

export interface WasmReturnStatement {
  type: "ReturnStatement";
}
