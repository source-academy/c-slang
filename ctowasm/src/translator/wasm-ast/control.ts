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

/**
 * Wasm instruction to branch out of a labeled block.
 */
export interface WasmBranch extends WasmAstNode {
  type: "Branch";
  label: string;
}

export interface WasmBranchTable extends WasmAstNode {
  type: "BranchTable";
  maxIndex: number; // the max index to branch to. e.g. if max index is 2, then the corersponding br_table instruction is (br_table 0 1 2) - it starts from 0 from the innermost block
  indexExpression: WasmExpression; // an expression which returns the index value to decide where to branch to
}

export interface WasmBlock extends WasmAstNode {
  type: "Block";
  label: string;
  body: WasmStatement[];
}
