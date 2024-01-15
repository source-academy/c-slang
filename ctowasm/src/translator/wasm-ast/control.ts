import {
  WasmAstNode,
  WasmExpression,
  WasmStatement,
} from "~src/translator/wasm-ast/core";
import { WasmBooleanExpression } from "~src/translator/wasm-ast/expressions";

/**
 * Definitions of wasm AST nodes to do with control flow instructions.
 */
export interface WasmSelectionStatement extends WasmAstNode {
  type: "SelectionStatement";
  condition: WasmBooleanExpression;
  actions: WasmStatement[];
  elseStatements: WasmStatement[];
}

export interface WasmLoop extends WasmAstNode {
  type: "Loop";
  label: string;
  body: WasmStatement[];
}

export interface WasmBranchIf extends WasmAstNode {
  type: "BranchIf";
  label: string; // the label to jump to
  condition: WasmExpression;
}

export interface WasmBranch extends WasmAstNode {
  type: "Branch";
  label: string;
}

export interface WasmBlock extends WasmAstNode {
  type: "Block";
  label: string;
  body: WasmStatement[];
}
