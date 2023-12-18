/**
 * Various utility functions with different uses will be defined here.
 */

import { WasmSymbolTable } from "~src/wasm-ast/functions";
import { WasmType } from "~src/wasm-ast/types";
import { WasmModule } from "~src/wasm-ast/core";
import {
  STACK_POINTER,
  WASM_PAGE_SIZE,
  BASE_POINTER,
  HEAP_POINTER,
  REG_1,
  REG_2,
} from "~src/translator/memoryUtil";

import {
  MemoryVariableByteSize,
  WasmLocalVariable,
  WasmMemoryVariable,
} from "~src/wasm-ast/memory";
import { WasmImportedFunction } from "~src/wasmModuleImports";
import { UnaryOperator, VariableType } from "~src/common/types";
import { variableTypeToWasmType } from "~src/translator/variableUtil";

/**
 * Converts a given unary opeartor to its corresponding binary operator
 */
export function unaryOperatorToInstruction(
  op: UnaryOperator,
  variableType: VariableType
) {
  return `${variableTypeToWasmType[variableType]}.${
    op === "++" ? "add" : "sub"
  }`;
}

// Maps wasm type to number of bytes it uses
export const wasmTypeToSize: Record<WasmType, MemoryVariableByteSize> = {
  i32: 4,
  i64: 8,
  f32: 4,
  f64: 8,
};

/**
 * Creates the global wasm variables that act as psuedo-registers.
 * @param wasmRoot
 * @param stackPreallocate the amount of space in bytes to preallocate before intitial stack pointer position
 * @param dataSegmentSize the size of the data segment in memory
 */
export function setPseudoRegisters(
  wasmRoot: WasmModule,
  stackPreallocate: number,
  dataSegmentSize: number
) {
  wasmRoot.globalWasmVariables.push({
    type: "GlobalVariable",
    name: STACK_POINTER,
    varType: "i32",
    initializerValue: {
      type: "Const",
      wasmVariableType: "i32",
      value: wasmRoot.memorySize * WASM_PAGE_SIZE - stackPreallocate,
    },
  });

  wasmRoot.globalWasmVariables.push({
    type: "GlobalVariable",
    name: BASE_POINTER,
    varType: "i32",
    initializerValue: {
      type: "Const",
      wasmVariableType: "i32",
      value: wasmRoot.memorySize * WASM_PAGE_SIZE, // BP starts at the memory boundary
    },
  });

  // heap segment follows immediately after data segment
  wasmRoot.globalWasmVariables.push({
    type: "GlobalVariable",
    name: HEAP_POINTER,
    varType: "i32",
    initializerValue: {
      type: "Const",
      wasmVariableType: "i32",
      value: Math.ceil(dataSegmentSize / 4) * 4, // align to 4 byte boundary
    },
  });

  wasmRoot.globalWasmVariables.push({
    type: "GlobalVariable",
    name: REG_1,
    varType: "i32",
    initializerValue: {
      type: "Const",
      wasmVariableType: "i32",
      value: 0,
    },
  });

  wasmRoot.globalWasmVariables.push({
    type: "GlobalVariable",
    name: REG_2,
    varType: "i32",
    initializerValue: {
      type: "Const",
      wasmVariableType: "i32",
      value: 0,
    },
  });
}

/**
 * Creates symbol with optional parent.
 * @param parentTable parent symbol table
 * @param resetOffset reset the offset counter for the new table, default false which uses parent tables offset
 */
export function createSymbolTable(
  parentTable?: WasmSymbolTable | null,
  resetOffset: boolean = false
): WasmSymbolTable {
  if (parentTable === null || typeof parentTable === "undefined") {
    // create a new root symbol table
    return {
      parentTable: null,
      currOffset: { value: 0 },
      variables: {},
    };
  }
  return {
    parentTable: parentTable,
    currOffset: resetOffset ? { value: 0 } : parentTable.currOffset,
    variables: {},
  };
}

/**
 * Add a variable to the symbol table of the current scope.
 */
export function addToSymbolTable(
  symbolTable: WasmSymbolTable,
  variable: WasmMemoryVariable
) {
  symbolTable.variables[variable.name] = variable;
  symbolTable.currOffset.value += variable.size;
}

/**
 * Used for generating unique names for block labels. This is needed for jumping to them in wasm.
 */
export function getUniqueLoopLabelGenerator() {
  let curr = 0; // starting label
  return () => `loop${curr++}`;
}

/**
 * Used for generating unique names for loop labels. This is needed for jumping to them in wasm.
 */
export function getUniqueBlockLabelGenerator() {
  let curr = 0;
  return () => `block${curr++}`;
}
