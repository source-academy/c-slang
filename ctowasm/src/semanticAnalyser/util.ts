import { VariableType } from "~src/common/types";

/**
 * Returns true if two variables of VariableType are the same.
 */
export function areVariableTypesTheSame(a: VariableType, b: VariableType) {
  if (a.type !== b.type) {
    return false;
  }

  if (a.type === "primary" && b.type === "primary") {
    return a.primaryDataType === b.primaryDataType;
  }

  if (a.type === "array" && b.type === "array") {
    return a.elementDataType === b.elementDataType && a.numElements === b.numElements
  }
}

export function areFunctionTypesTheSame() {

}