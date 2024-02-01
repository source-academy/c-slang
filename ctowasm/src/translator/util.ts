/**
 * Various utility functions with different uses will be defined here.
 */

import { WasmDataType, WasmIntType } from "~src/translator/wasm-ast/dataTypes";
import { WasmModule } from "~src/translator/wasm-ast/core";
import {
  STACK_POINTER,
  WASM_PAGE_SIZE,
  BASE_POINTER,
  HEAP_POINTER,
  REG_1,
  REG_2,
  WASM_ADDR_TYPE,
} from "~src/translator/memoryUtil";

import { MemoryVariableByteSize } from "~src/translator/wasm-ast/memory";
import { ArithemeticUnaryOperator } from "~src/common/types";
import { DataType } from "~src/parser/c-ast/dataTypes";
import { priamryCDataTypeToWasmType } from "./dataTypeUtil";
import { WasmIntegerConst } from "~src/translator/wasm-ast/consts";
import { TranslationError, toJson } from "~src/errors";
import { WasmBooleanExpression } from "~src/translator/wasm-ast/expressions";
import { ExpressionP } from "~src/processor/c-ast/core";
import translateExpression from "~src/translator/translateExpression";

/**
 * Converts a given unary opeartor to its corresponding binary operator
 */
export function arithmeticUnaryOperatorToInstruction(
  op: ArithemeticUnaryOperator,
  dataType: DataType,
) {
  if (dataType.type === "primary") {
    return `${priamryCDataTypeToWasmType[dataType.primaryDataType]}.${
      op === "++" ? "add" : "sub"
    }`;
  } else if (dataType.type === "pointer") {
    return `${WASM_ADDR_TYPE}.${op === "++" ? "add" : "sub"}`;
  } else {
    // arithmetic is not defined for non ints or non pointers
    throw new TranslationError(
      `arithmeticUnaryOperatorToInstruction(): Unsupported variable type: ${toJson(
        dataType,
      )}`,
    );
  }
}

// Maps wasm type to number of bytes it uses
export const wasmTypeToSize: Record<WasmDataType, MemoryVariableByteSize> = {
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
  dataSegmentSize: number,
) {
  wasmRoot.globalWasmVariables.push({
    type: "GlobalVariable",
    name: STACK_POINTER,
    wasmDataType: "i32",
    initializerValue: {
      type: "IntegerConst",
      wasmDataType: "i32",
      value: BigInt(wasmRoot.memorySize * WASM_PAGE_SIZE),
    },
  });

  wasmRoot.globalWasmVariables.push({
    type: "GlobalVariable",
    name: BASE_POINTER,
    wasmDataType: "i32",
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
    wasmDataType: "i32",
    initializerValue: {
      type: "IntegerConst",
      wasmDataType: "i32",
      value: BigInt(Math.ceil(dataSegmentSize / 4) * 4), // align to 4 byte boundary
    },
  });

  wasmRoot.globalWasmVariables.push({
    type: "GlobalVariable",
    name: REG_1,
    wasmDataType: "i32",
    initializerValue: {
      type: "IntegerConst",
      wasmDataType: "i32",
      value: 0n,
    },
  });

  wasmRoot.globalWasmVariables.push({
    type: "GlobalVariable",
    name: REG_2,
    wasmDataType: "i32",
    initializerValue: {
      type: "IntegerConst",
      wasmDataType: "i32",
      value: 0n,
    },
  });
}

/**
 * Returns a WasmIntegerConst node that contains maximum integer value for either i32 or i64 type.
 * Used for negating integer types.
 */
export function getMaxIntConstant(intType: "i32" | "i64"): WasmIntegerConst {
  if (intType === "i32") {
    return {
      type: "IntegerConst",
      value: 4294967295n,
      wasmDataType: "i32",
    };
  } else {
    return {
      type: "IntegerConst",
      value: 18446744073709551615n,
      wasmDataType: "i64",
    };
  }
}

/**
 * Translate an expression that is expected to be a boolean value.
 */
export function createWasmBooleanExpression(
  expression: ExpressionP,
  isNegated?: boolean,
): WasmBooleanExpression {
  return {
    type: "BooleanExpression",
    expr: translateExpression(expression, "signed int"),
    wasmDataType: "i32",
    isNegated,
  };
}

export function createIntegerConst(
  value: number,
  wasmDataType: WasmIntType,
): WasmIntegerConst {
  return {
    type: "IntegerConst",
    wasmDataType,
    value: BigInt(value),
  };
}
