/**
 * Definitions of nodes that interact with wasm linear memory.
 */

import { WasmType } from "~src/wasm-ast/types";
import { WasmAstNode, WasmExpression } from "~src/wasm-ast/core";
import { DataType } from "~src/parser/c-ast/dataTypes";

export type MemoryVariableByteSize = 1 | 2 | 4 | 8;

export interface WasmMemoryLoad extends WasmAstNode {
  type: "MemoryLoad";
  addr: WasmExpression; // the offset in memory to load from
  wasmDataType: WasmType;
  numOfBytes: MemoryVariableByteSize; // number of bytes to load
}

export interface WasmMemoryStore extends WasmAstNode {
  type: "MemoryStore";
  addr: WasmExpression;
  value: WasmExpression;
  wasmDataType: WasmType; // wasm var type for the store instruction
  numOfBytes: MemoryVariableByteSize; // number of bytes to store
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
  type: "GlobalMemoryVariable" | "LocalMemoryVariable";
  name: string;
  dataType: DataType; // the original C variable type
  offset: number; // offset from the start of the scope that this variable is in. This is address for globals, offset from BP for locals/params
}

/**
 * Defines the wasm node that represents the initializing of global variables in the data memory segment.
 */
export interface WasmDataSegmentInitialization {
  addr: number;
  byteStr: string;
}
