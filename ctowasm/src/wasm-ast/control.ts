import { WasmAstNode, WasmExpression, WasmStatement } from "~src/wasm-ast/core";

/**
 * Definitions of wasm AST nodes to do with control flow instructions.
 */
export interface WasmSelectStatement extends WasmAstNode {
  type: "SelectStatement";
  condition: WasmExpression;
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
