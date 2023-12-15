/**
 * Contains a set of common utility functions used across modules.
 */

import { VariableType } from "~src/common/types";
import { MemoryVariableByteSize } from "~src/wasm-ast/memory";

/**
 * Definitions of the sizes in bytes of the supported C variables types.
 */
const variableSizes: Record<VariableType, MemoryVariableByteSize> = {
  char: 1,
  short: 2,
  int: 4,
  long: 8,
};

/**
 * Returns the size in bytes of a variable given its type.
 */
export function getVariableSize(varType: VariableType): MemoryVariableByteSize {
  return variableSizes[varType];
}
