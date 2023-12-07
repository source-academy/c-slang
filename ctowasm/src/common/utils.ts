/**
 * Contains a set of common utility functions used across modules.
 */

import { VariableType } from "~src/common/types";

/**
 * Returns the size in bytes of a variable given its type.
 */
export function getVariableSize(varType: VariableType) {
  switch (varType) {
    case "int":
      return 4;
    case "char":
      return 1;
  }
}