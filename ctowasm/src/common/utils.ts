/**
 * Contains a set of common utility functions used across modules.
 */

import { CNode } from "~src/c-ast/core";
import { WASM_ADDR_SIZE } from "~src/common/constants";
import { PrimaryCDataType, VariableType } from "~src/common/types";
import { MemoryVariableByteSize } from "~src/wasm-ast/memory";

/**
 * Definitions of the sizes in bytes of the supported C variables types.
 */
export const primaryVariableSizes: Record<PrimaryCDataType, MemoryVariableByteSize> = {
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
 * Returns the size in bytes of a variable given its type.
 */
export function getVariableSize(
  varType: VariableType
): number {
  if (varType.type === "primary") {
    return primaryVariableSizes[varType.primaryDataType]
  } else if (varType.type === "pointer") {
    return WASM_ADDR_SIZE;
  } else if (varType.type === "array") {
    return getVariableSize(varType.elementDataType) * varType.numElements
  } else if (varType.type === "struct") {
    return 0; // TODO: not yet supported
  }
}

export function isSignedIntegerType(variableType: VariableType) {
  if (variableType.type !== "primary") {
    return false;
  }
  return (
    variableType.primaryDataType === "signed char" ||
    variableType.primaryDataType === "signed short" ||
    variableType.primaryDataType === "signed int" ||
    variableType.primaryDataType === "signed long"
  );
}

export function isUnsignedIntegerType(variableType: VariableType) {
  if (variableType.type !== "primary") {
    return false;
  }
  return (
    variableType.primaryDataType === "unsigned char" ||
    variableType.primaryDataType === "unsigned short" ||
    variableType.primaryDataType === "unsigned int" ||
    variableType.primaryDataType === "unsigned long"
  );
}

export function isFloatType(variableType: VariableType) {
  if (variableType.type !== "primary") {
    return false;
  }
  return variableType.primaryDataType === "float" || variableType.primaryDataType === "double";
}

export function isIntegerType(variableType: VariableType) {
  return (
    isUnsignedIntegerType(variableType) || isSignedIntegerType(variableType)
  );
}

export function isConstant(node: CNode) {
  return node.type === "IntegerConstant" || node.type === "FloatConstant";
}
