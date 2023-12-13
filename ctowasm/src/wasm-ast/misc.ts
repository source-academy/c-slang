import { WasmType } from "~src/wasm-ast/types";
import { WasmAstNode } from "~src/wasm-ast/core";

/**
 * Definitions of wasm AST nodes that do not fall under other categories.
 */
export interface WasmFunctionImport extends WasmAstNode {
  type: "FunctionImport";
  importPath: string[]; // the path to this imported function e.g. ["console", "log"]
  name: string; // name of this function within the wasm module. May not match the last index of import path!
  params: WasmType[];
  return: WasmType | null;
}
