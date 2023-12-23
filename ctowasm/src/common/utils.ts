/**
 * Contains a set of common utility functions used across modules.
 */

import { CNode } from "~src/c-ast/core";
import { VariableType } from "~src/common/types";
import { MemoryVariableByteSize } from "~src/wasm-ast/memory";

/**
 * Definitions of the sizes in bytes of the supported C variables types.
 */
const variableSizes: Record<VariableType, MemoryVariableByteSize> = {
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
export function getVariableSize(varType: VariableType): MemoryVariableByteSize {
  return variableSizes[varType];
}

export function isSignedIntegerType(variableType: VariableType) {
  return (
    variableType === "signed char" ||
    variableType === "signed short" ||
    variableType === "signed int" ||
    variableType === "signed long"
  );
}

export function isUnsignedIntegerType(variableType: VariableType) {
  return (
    variableType === "unsigned char" ||
    variableType === "unsigned short" ||
    variableType === "unsigned int" ||
    variableType === "unsigned long"
  );
}

export function isFloatType(variableType: VariableType) {
  return variableType === "float" || variableType === "double";
}

export function isIntegerType(variableType: VariableType) {
  return (
    isUnsignedIntegerType(variableType) || isSignedIntegerType(variableType)
  );
}

export function isConstant(node: CNode) {
  return node.type === "IntegerConstant" || node.type === "FloatConstant";
}
