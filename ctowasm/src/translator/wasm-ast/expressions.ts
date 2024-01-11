/**
 * Definitions of wasm AST nodes to do with expressions.
 */

import { WasmAstNode, WasmExpression } from "~src/translator/wasm-ast/core";

export interface WasmBinaryExpression extends WasmAstNode {
  type: "BinaryExpression";
  instruction: string; // the exact binary instruction to use
  leftExpr: WasmExpression;
  rightExpr: WasmExpression;
}

/**
 * Specific instruction for negating floats.
 */
export interface WasmNegateFloatExpression extends WasmAstNode {
  type: "NegateFloatExpression";
  wasmDataType: "f32" | "f64";
  expr: WasmExpression;
}
