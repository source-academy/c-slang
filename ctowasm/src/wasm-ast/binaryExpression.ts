/**
 * Definitions of wasm AST nodes to do with operations (arithmetic, boolean etc).
 */

import { WasmExpression } from "~src/wasm-ast/core";

export interface WasmBinaryExpression extends WasmExpression {
  type: "BinaryExpression";
  instruction: string; // the exact binary instruction to use
  leftExpr: WasmExpression;
  rightExpr: WasmExpression;
}
