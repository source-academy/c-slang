/**
 * Definition of SymbolTable used by Translator, along with helper functions.
 */

import { TranslationError } from "~src/errors";
import { WasmMemoryVariable } from "~src/wasm-ast/memory";

/**
 * Some type definitions for non-node objects.
 */
// Nested Symbol Table
// global scope -> function parameter scope -> function body scope -> block scope (if available)
export interface WasmSymbolTable {
  parentTable: WasmSymbolTable | null;
  currOffset: { value: number }; // current offset saved as "value" in an object. Used to make it sharable as a reference across tables
  variables: Record<string, WasmMemoryVariable>;
} /**
 * Retrieves information on variable from given function's symbol table, or from globals in wasmRoot if not found.
 */

export function retrieveVariableFromSymbolTable(
  symbolTable: WasmSymbolTable,
  variableName: string
) {
  let curr = symbolTable;

  while (curr !== null) {
    if (variableName in curr.variables) {
      return curr.variables[variableName];
    }
    curr = curr.parentTable;
  }
  // should not happen
  throw new TranslationError("Symbol not found");
}
