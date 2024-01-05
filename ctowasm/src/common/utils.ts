/**
 * Contains a set of common utility functions used across modules.
 */

import { CNodeBase } from "~src/parser/c-ast/core";
import { WASM_ADDR_SIZE } from "~src/common/constants";
import { PrimaryCDataType, DataType } from "~src/common/types";
import { MemoryVariableByteSize } from "~src/wasm-ast/memory";
import { UnsupportedFeatureError, toJson } from "~src/errors";

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
    // TODO: when structs supported
    throw new UnsupportedFeatureError("getDataTypeSize(): structs not yet supported")
  } else if (varType.type === "typedef") {
    // TODO: when typedef supported
    throw new UnsupportedFeatureError("getDataTypeSize(): typedef not yet supported")
  } else {
    throw new Error(`getDataTypeSize(): unhandled data type: ${toJson(varType)}`)
  }
}

export function isSignedIntegerType(dataType: PrimaryCDataType) {
  return (
    dataType === "signed char" ||
    dataType === "signed short" ||
    dataType === "signed int" ||
    dataType === "signed long"
  );
}

export function isUnsignedIntegerType(dataType: PrimaryCDataType) {
  return (
    dataType === "unsigned char" ||
    dataType === "unsigned short" ||
    dataType === "unsigned int" ||
    dataType === "unsigned long"
  );
}

export function isFloatType(dataType: PrimaryCDataType) {
  return (
    dataType === "float" ||
    dataType === "double"
  );
}

export function isIntegerType(dataType: PrimaryCDataType) {
  return isUnsignedIntegerType(dataType) || isSignedIntegerType(dataType);
}

export function isConstant(node: CNodeBase) {
  return node.type === "IntegerConstant" || node.type === "FloatConstant";
}

/**
 * Returns true if the type is scalar.
 * Only primary data types and pointers are scalar.
 */
export function isScalarType(dataType: DataType) {
  return dataType.type === "primary" || dataType.type === "pointer";
}
