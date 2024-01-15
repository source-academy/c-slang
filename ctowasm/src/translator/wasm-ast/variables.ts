/**
 * Definitions of nodes for wasm variables (not the C variables that are stored in memory), and supporting operations.
 */

import { WasmDataType } from "~src/translator/wasm-ast/dataTypes";
import {
  WasmAstNode,
  WasmExpression,
  WasmStatement,
} from "~src/translator/wasm-ast/core";
import { WasmConst } from "~src/translator/wasm-ast/consts";

export interface WasmVariable extends WasmAstNode {
  name: string;
  isConst?: boolean; // TODO: to support later on
  wasmDataType: WasmDataType;
}

/**
 * Actual WASM globals variables.
 */
export interface WasmGlobalVariable extends WasmVariable {
  type: "GlobalVariable";
  initializerValue?: WasmConst;
}

export interface WasmGlobalSet extends WasmAstNode {
  type: "GlobalSet";
  name: string;
  value: WasmExpression;
}

export interface WasmLocalSet extends WasmAstNode {
  type: "LocalSet";
  name: string;
  wasmDataType: WasmDataType;
}

export interface WasmLocalGet extends WasmAstNode {
  type: "LocalGet";
  name: string;
}

export interface WasmGlobalGet extends WasmAstNode {
  type: "GlobalGet";
  name: string;
}
