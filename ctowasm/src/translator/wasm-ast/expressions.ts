/**
 * Definitions of wasm AST nodes to do with expressions.
 */

import {
  WasmAstNode,
  WasmExpression,
  WasmStatement,
} from "~src/translator/wasm-ast/core";
import { WasmDataType } from "~src/translator/wasm-ast/dataTypes";

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

/**
 * An expression that involves some statement(s) occuring beforehand.
 */
export interface WasmPreStatementExpression extends WasmAstNode {
  type: "PreStatementExpression";
  statements: WasmStatement[];
  expr: WasmExpression;
}

/**
 * An expression that involves some statement(s) occuring afterwards.
 */
export interface WasmPostStatementExpression extends WasmAstNode {
  type: "PostStatementExpression";
  statements: WasmStatement[];
  expr: WasmExpression;
}

/**
 * Base class for nodes that are meant to wrap other expressions to perform some simple operation on the results of the wrapped expression.
 */
export interface WasmWrapperNode extends WasmAstNode {
  expr: WasmExpression;
}

/**
 * Special wrapper node to handle converting an expression value to a "boolean" value (1 or 0).
 * Any number except 0 will be converted to 1.
 */
export interface WasmBooleanExpression extends WasmWrapperNode {
  type: "BooleanExpression";
  wasmDataType: WasmDataType;
  isNegated?: boolean;
}

/**
 * Wasm's version of a conditional expression e.g. 1 ? 2 : 3
 */
export interface WasmSelectExpression extends WasmAstNode {
  type: "SelectExpression";
  condition: WasmExpression;
  trueExpression: WasmExpression;
  falseExpression: WasmExpression;
}
