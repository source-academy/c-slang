/**
 * Definitions of nodes for wasm variables (not the C variables that are stored in memory), and supporting operations.
 */

import { WasmType } from "~src/wasm-ast/types";
import {
  WasmAstNode,
  WasmExpression,
  WasmStatement,
} from "~src/wasm-ast/core";
import { WasmConst } from "~src/wasm-ast/consts";

export interface WasmVariable extends WasmAstNode {
  name: string;
  isConst?: boolean; // TODO: to support later on
  varType: WasmType;
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
  preStatements?: (WasmStatement | WasmExpression)[];
}

export interface WasmLocalSet extends WasmAstNode {
  type: "LocalSet";
  name: string;
  value: WasmExpression;
  preStatements?: (WasmStatement | WasmExpression)[];
}

export interface WasmLocalGet extends WasmExpression {
  type: "LocalGet";
  name: string;
  preStatements?: (WasmStatement | WasmExpression)[];
}

export interface WasmGlobalGet extends WasmExpression {
  type: "GlobalGet";
  name: string;
  preStatements?: (WasmStatement | WasmExpression)[];
}
