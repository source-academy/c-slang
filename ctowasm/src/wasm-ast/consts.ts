/**
 * Definition of WAT nodes for consts.
 */

import { WasmExpression } from "~src/wasm-ast/core";

export type WasmConst = WasmIntegerConst | WasmFloatConst;

export interface WasmIntegerConst extends WasmExpression {
  type: "IntegerConst";
  value: bigint;
}

export interface WasmFloatConst extends WasmExpression {
  type: "FloatConst";
  value: number;
}
