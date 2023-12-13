/**
 * Definitions of nodes that interact with wasm linear memory.
 */

import { WasmType } from "~src/wasm-ast/types";
import {
  WasmAstNode,
  WasmExpression,
  WasmStatement,
  WasmConst,
} from "~src/wasm-ast/core";

export type MemoryVariableByteSize = 1 | 4 | 8;

export interface WasmMemoryLoad extends WasmAstNode {
  type: "MemoryLoad";
  addr: WasmExpression; // the offset in memory to load from
  varType: WasmType; // wasm var type for the store instruction
  numOfBytes: MemoryVariableByteSize; // number of bytes to load
  preStatements?: (WasmStatement | WasmExpression)[];
}

export interface WasmMemoryStore extends WasmAstNode {
  type: "MemoryStore";
  addr: WasmExpression;
  value: WasmExpression;
  varType: WasmType; // wasm var type for the store instruction
  numOfBytes: MemoryVariableByteSize; // number of bytes to store
  preStatements?: (WasmStatement | WasmExpression)[];
}

export interface WasmMemoryGrow extends WasmAstNode {
  type: "MemoryGrow";
  pagesToGrowBy: WasmExpression;
}

export interface WasmMemorySize extends WasmAstNode {
  type: "MemorySize";
}

/**
 * A variable that is meant to be stored in memory.
 */
export interface WasmMemoryVariable extends WasmAstNode {
  name: string;
  size: number; // size in bytes of this variable
  varType: WasmType; // the wasm type to use when loading/storing this variable
}

export interface WasmLocalVariable extends WasmMemoryVariable {
  type: "LocalVariable" | "FunctionParameter" | "LocalArray";
  bpOffset: number; // offset in number of bytes from base pointer
}

export interface WasmLocalArray extends WasmLocalVariable {
  // size field will represent size in number of elements instead
  elementSize: number; // size of each element
}

export interface WasmFunctionParameter extends WasmLocalVariable {
  type: "FunctionParameter";
  paramIndex: number; // index of this param in the list of params of the function
}

/**
 * Global variables will be in the 'data' segment of memory.
 */
export interface WasmDataSegmentVariable extends WasmMemoryVariable {
  type: "DataSegmentVariable";
  initializerValue?: WasmConst; // initial value to set this global value to
  memoryAddr: number; // offset from start of memory that this variable is at
}

export interface WasmDataSegmentArray extends WasmMemoryVariable {
  type: "DataSegmentArray";
  elementSize: number; // size of elements of the array
  memoryAddr: number;
  initializerList?: WasmConst[];
}
