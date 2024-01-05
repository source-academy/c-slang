import { DataType } from "~src/processor/c-ast/dataTypes";

/**
 * Returns true if two variables of dataType are the same.
 */
export function areDataTypesTheSame(a: DataType, b: DataType) {
  if (a.type !== b.type) {
    return false;
  }

  if (a.type === "primary" && b.type === "primary") {
    return a.primaryDataType === b.primaryDataType;
  }

  if (a.type === "array" && b.type === "array") {
    return (
      a.elementDataType === b.elementDataType && a.numElements === b.numElements
    );
  }
}

export function areFunctionTypesTheSame() {}
