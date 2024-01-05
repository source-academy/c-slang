/**
 * Various utility functions with different uses will be defined here.
 */

import { WasmImportedFunction } from "~src/wasm-ast/functions";
import { WasmSymbolTable } from "./symbolTable";
import { WasmType } from "~src/wasm-ast/types";
import { WasmModule } from "~src/wasm-ast/core";
import {
  STACK_POINTER,
  WASM_PAGE_SIZE,
  BASE_POINTER,
  HEAP_POINTER,
  REG_1,
  REG_2,
  WASM_ADDR_TYPE,
} from "~src/translator/memoryUtil";

import {
  MemoryVariableByteSize,
  WasmMemoryVariable,
} from "~src/wasm-ast/memory";
import { ArithemeticUnaryOperator } from "~src/common/types";
import { DataType } from "~src/processor/c-ast/dataTypes";
import { primaryCDataTypeToWasmType } from "~src/translator/variableUtil";
import { ImportedFunction } from "~src/wasmModuleImports";
import { WasmIntegerConst } from "~src/wasm-ast/consts";
import { getDataTypeSize } from "~src/common/utils";
import { TranslationError, toJson } from "~src/errors";

/**
 * Converts a given unary opeartor to its corresponding binary operator
 */
export function arithmeticUnaryOperatorToInstruction(
  op: ArithemeticUnaryOperator,
  dataType: DataType
) {
  if (dataType.type === "primary") {
    return `${primaryCDataTypeToWasmType[dataType.primaryDataType]}.${
      op === "++" ? "add" : "sub"
    }`;
  } else if (dataType.type === "pointer") {
    return `${WASM_ADDR_TYPE}.${op === "++" ? "add" : "sub"}`;
  } else {
    // arithmetic is not defined for non ints or non pointers
    throw new TranslationError(
      `arithmeticUnaryOperatorToInstruction(): Unsupported variable type: ${toJson(
        dataType
      )}`
    );
  }
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
      type: "IntegerConst",
      wasmDataType: "i32",
      value: BigInt(wasmRoot.memorySize * WASM_PAGE_SIZE - stackPreallocate),
    },
  });

  wasmRoot.globalWasmVariables.push({
    type: "GlobalVariable",
    name: BASE_POINTER,
    varType: "i32",
    initializerValue: {
      type: "IntegerConst",
      wasmDataType: "i32",
      value: BigInt(wasmRoot.memorySize * WASM_PAGE_SIZE), // BP starts at the memory boundary
    },
  });

  // heap segment follows immediately after data segment
  wasmRoot.globalWasmVariables.push({
    type: "GlobalVariable",
    name: HEAP_POINTER,
    varType: "i32",
    initializerValue: {
      type: "IntegerConst",
      wasmDataType: "i32",
      value: BigInt(Math.ceil(dataSegmentSize / 4) * 4), // align to 4 byte boundary
    },
  });

  wasmRoot.globalWasmVariables.push({
    type: "GlobalVariable",
    name: REG_1,
    varType: "i32",
    initializerValue: {
      type: "IntegerConst",
      wasmDataType: "i32",
      value: 0n,
    },
  });

  wasmRoot.globalWasmVariables.push({
    type: "GlobalVariable",
    name: REG_2,
    varType: "i32",
    initializerValue: {
      type: "IntegerConst",
      wasmDataType: "i32",
      value: 0n,
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
  symbolTable.currOffset.value += getDataTypeSize(variable.dataType);
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

export function processImportedFunctions(
  importedFunctions: Record<string, ImportedFunction>
): Record<string, WasmImportedFunction> {
  const result: Record<string, WasmImportedFunction> = {};
  for (const f of Object.keys(importedFunctions)) {
    result[f] = {
      ...importedFunctions[f],
      wasmParamTypes: importedFunctions[f].params.map(
        (p) => primaryCDataTypeToWasmType[p]
      ),
      returnWasmType:
        importedFunctions[f].return !== null
          ? primaryCDataTypeToWasmType[importedFunctions[f].return]
          : null,
    };
  }
  return result;
}

/**
 * Returns a WasmIntegerConst node that contains maximum integer value for either i32 or i64 type.
 * Used for negating integer types.
 */
export function getMaxIntConstant(intType: "i32" | "i64"): WasmIntegerConst {
  if (intType === "i32") {
    return {
      type: "IntegerConst",
      value: 4294967296n,
      wasmDataType: "i32",
    };
  } else {
    return {
      type: "IntegerConst",
      value: 9223372036854775808n,
      wasmDataType: "i64",
    };
  }
}
