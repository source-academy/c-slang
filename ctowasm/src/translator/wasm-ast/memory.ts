/**
 * Definitions of nodes that interact with wasm linear memory.
 */

import { WasmDataType } from "~src/translator/wasm-ast/dataTypes";
import { WasmAstNode, WasmExpression } from "~src/translator/wasm-ast/core";

export type MemoryVariableByteSize = 1 | 2 | 4 | 8;

export interface WasmMemoryLoad extends WasmAstNode {
  type: "MemoryLoad";
  addr: WasmExpression; // the offset in memory to load from
  wasmDataType: WasmDataType;
  numOfBytes: MemoryVariableByteSize; // number of bytes to load
}

interface WasmMemoryStoreBase extends WasmAstNode {
  type: "MemoryStore" | "MemoryStoreFromWasmStack";
  addr: WasmExpression;
  wasmDataType: WasmDataType; // wasm var type for the store instruction
  numOfBytes: MemoryVariableByteSize; // number of bytes to store
}

// stores the result of a specific expression
export interface WasmMemoryStore extends WasmMemoryStoreBase {
  type: "MemoryStore";
  value: WasmExpression;
}

// stores the given value already on wasm stack
export interface WasmMemoryStoreFromWasmStack extends WasmMemoryStoreBase {
  type: "MemoryStoreFromWasmStack";
}

export interface WasmMemoryGrow extends WasmAstNode {
  type: "MemoryGrow";
  pagesToGrowBy: WasmExpression;
}

export interface WasmMemorySize extends WasmAstNode {
  type: "MemorySize";
}
