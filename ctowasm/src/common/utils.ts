/**
 * Contains a set of common utility functions used across modules.
 */

import { CNodeBase } from "~src/parser/c-ast/core";
import { PrimaryCDataType, ScalarCDataType } from "~src/common/types";
import { MemoryVariableByteSize } from "~src/translator/wasm-ast/memory";
import { POINTER_SIZE } from "~src/common/constants";
import { WASM_PAGE_SIZE } from "~src/translator/memoryUtil";

/**
 * Definitions of the sizes in bytes of the supported C variables types.
 */
export const primaryDataTypeSizes: Record<
  PrimaryCDataType,
  MemoryVariableByteSize
> = {
  ["unsigned char"]: 1,
  ["signed char"]: 1,
  ["unsigned short"]: 2,
  ["signed short"]: 2,
  ["unsigned int"]: 4,
  ["signed int"]: 4,
  ["unsigned long"]: 8,
  ["signed long"]: 8,
  ["float"]: 4,
  ["double"]: 8,
};

export function getSizeOfScalarDataType(dataType: ScalarCDataType) {
  if (dataType === "pointer") {
    return POINTER_SIZE;
  }
  return primaryDataTypeSizes[dataType];
}

export function isSignedIntegerType(dataType: ScalarCDataType) {
  return (
    dataType === "signed char" ||
    dataType === "signed short" ||
    dataType === "signed int" ||
    dataType === "signed long"
  );
}

export function isUnsignedIntegerType(dataType: ScalarCDataType) {
  return (
    dataType === "unsigned char" ||
    dataType === "unsigned short" ||
    dataType === "unsigned int" ||
    dataType === "unsigned long"
  );
}

export function isFloatType(dataType: ScalarCDataType) {
  return dataType === "float" || dataType === "double";
}

export function isIntegerType(dataType: ScalarCDataType) {
  return isUnsignedIntegerType(dataType) || isSignedIntegerType(dataType);
}

export function isConstant(node: CNodeBase) {
  return node.type === "IntegerConstant" || node.type === "FloatConstant";
}

/**
 * Returns the total number of wasm memory pages needed to store the given number of bytes.
 */
export function calculateNumberOfPagesNeededForBytes(numBytes: number) {
  return Math.floor(numBytes / WASM_PAGE_SIZE) + 1;
}
