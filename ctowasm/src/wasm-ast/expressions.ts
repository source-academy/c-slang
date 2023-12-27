/**
 * Definitions of wasm AST nodes to do with expressions.
 */

import { WasmExpression } from "~src/wasm-ast/core";

export interface WasmBinaryExpression extends WasmExpression {
  type: "BinaryExpression";
  instruction: string; // the exact binary instruction to use
  leftExpr: WasmExpression;
  rightExpr: WasmExpression;
}

/**
 * Specific instruction for negating floats.
 */
export interface WasmNegateFloatExpression extends WasmExpression {
  type: "NegateFloatExpression";
  wasmVariableType: "f32" | "f64";
  expr: WasmExpression;
}
