/**
 * Various utility functions with different uses will be defined here.
 */

import { BinaryOperator } from "~src/common/constants";
import { WasmType } from "~src/wasm-ast/types";
import { WasmStatement, WasmFunction } from "~src/wasm-ast/wasm-nodes";

/**
 * Converts a given unary opeartor to its corresponding binary operator
 */
export const unaryOperatorToBinaryOperator: Record<string, BinaryOperator> = {
  "++": "+",
  "--": "-",
};

export function addStatement(
  n: WasmStatement,
  enclosingFunc: WasmFunction,
  enclosingBody?: WasmStatement[]
) {
  if (typeof enclosingBody !== "undefined") {
    enclosingBody.push(n);
  } else {
    enclosingFunc.body.push(n);
  }
}

// Maps wasm type to number of bytes it uses
export const wasmTypeToSize: Record<WasmType, number> = {
  i32: 4,
  i64: 8,
  f32: 4,
  f64: 8,
};
