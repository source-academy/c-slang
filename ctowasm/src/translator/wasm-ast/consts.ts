import { WasmAstNode } from "~src/translator/wasm-ast/core";

/**
 * Definition of WAT nodes for consts.
 */
export type WasmConst = WasmIntegerConst | WasmFloatConst;

export interface WasmIntegerConst extends WasmAstNode {
  type: "IntegerConst";
  value: bigint;
  wasmDataType: "i32" | "i64";
}

export interface WasmFloatConst extends WasmAstNode {
  type: "FloatConst";
  value: number;
  wasmDataType: "f32" | "f64";
}
