/**
 * Contains a set of common utility functions used across modules.
 */

import { CNode } from "~src/c-ast/core";
import { WASM_ADDR_SIZE } from "~src/common/constants";
import { PrimaryCDataType, DataType } from "~src/common/types";
import { MemoryVariableByteSize } from "~src/wasm-ast/memory";

/**
 * Definitions of the sizes in bytes of the supported C variables types.
 */
export const primaryVariableSizes: Record<
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

/**
 * Returns the size in bytes of a data type.
 */
export function getDataTypeSize(varType: DataType): number {
  if (varType.type === "primary") {
    return primaryVariableSizes[varType.primaryDataType];
  } else if (varType.type === "pointer") {
    return WASM_ADDR_SIZE;
  } else if (varType.type === "array") {
    return getDataTypeSize(varType.elementDataType) * varType.numElements;
  } else if (varType.type === "struct") {
    return 0; // TODO: not yet supported
  }
}

export function isSignedIntegerType(dataType: DataType) {
  if (dataType.type !== "primary") {
    return false;
  }
  return (
    dataType.primaryDataType === "signed char" ||
    dataType.primaryDataType === "signed short" ||
    dataType.primaryDataType === "signed int" ||
    dataType.primaryDataType === "signed long"
  );
}

export function isUnsignedIntegerType(dataType: DataType) {
  if (dataType.type !== "primary") {
    return false;
  }
  return (
    dataType.primaryDataType === "unsigned char" ||
    dataType.primaryDataType === "unsigned short" ||
    dataType.primaryDataType === "unsigned int" ||
    dataType.primaryDataType === "unsigned long"
  );
}

export function isFloatType(dataType: DataType) {
  if (dataType.type !== "primary") {
    return false;
  }
  return (
    dataType.primaryDataType === "float" ||
    dataType.primaryDataType === "double"
  );
}

export function isIntegerType(dataType: DataType) {
  return isUnsignedIntegerType(dataType) || isSignedIntegerType(dataType);
}

export function isConstant(node: CNode) {
  return node.type === "IntegerConstant" || node.type === "FloatConstant";
}

/**
 * Returns true if the type is scalar.
 * Only primary data types and pointers are scalar.
 */
export function isScalarType(dataType: DataType) {
  return dataType.type === "primary" || dataType.type === "pointer";
}
