import { WasmSelectStatement, WasmLoop, WasmBranchIf, WasmBranch, WasmBlock } from "~src/wasm-ast/control";
import { WasmFunction, WasmFunctionCallStatement, WasmReturnStatement, WasmRegularFunctionCall, WasmFunctionCall } from "~src/wasm-ast/functions";
import { WasmDataSegmentVariable, WasmDataSegmentArray, WasmGlobalVariable, WasmMemoryStore, WasmMemoryGrow, WasmMemoryLoad, WasmMemorySize } from "~src/wasm-ast/memory";
import { WasmFunctionImport } from "~src/wasm-ast/misc";
import { WasmArithmeticExpression, WasmBooleanExpression, WasmAndExpression, WasmOrExpression, WasmComparisonExpression } from "~src/wasm-ast/operations";
import { WasmType } from "~src/wasm-ast/types";
import { WasmGlobalSet, WasmLocalSet, WasmLocalGet, WasmGlobalGet } from "~src/wasm-ast/variables";

/**
 * Main file containing all the core wasm AST node definitions.
 */
export interface WasmAstNode {
  type: string;
}

export interface WasmConst extends WasmAstNode {
  type: "Const";
  variableType: WasmType;
  value: number;
}

export interface WasmModule extends WasmAstNode {
  type: "Module";
  globals: Record<string, WasmDataSegmentVariable | WasmDataSegmentArray>;
  globalWasmVariables: WasmGlobalVariable[];
  functions: Record<string, WasmFunction>;
  memorySize: number; // number of pages of memory needed for this module
  importedFunctions: WasmFunctionImport[];
}

// A wasm statement is an instruction meant to be used in a situation that does not involve a value being pushed on virtual wasm stack.
export type WasmStatement =
  | WasmGlobalSet
  | WasmLocalSet
  | WasmFunctionCallStatement
  | WasmSelectStatement
  | WasmReturnStatement
  | WasmLoop
  | WasmBranchIf
  | WasmBranch
  | WasmBlock
  | WasmMemoryStore
  | WasmMemoryGrow
  | WasmRegularFunctionCall;

/**
 * A special type of statement that results in 1 value being put on the stack,
 * in effect behaving like a WasmExpression.
 *
 * Currently this is only enabled for setting statements, to allowing postfix/prefix operators to work.
 */
export type WasmExprStatement = WasmLocalSet | WasmGlobalSet | WasmMemoryStore;

// A wasm expression is an instruction meant to be used in a situation that involves the pushing of a value onto virtual wasm stack.
export type WasmExpression =
  | WasmFunctionCall
  | WasmConst
  | WasmLocalGet
  | WasmGlobalGet
  | WasmArithmeticExpression
  | WasmExprStatement
  | WasmBooleanExpression
  | WasmAndExpression
  | WasmOrExpression
  | WasmComparisonExpression
  | WasmMemoryLoad
  | WasmMemorySize
  | WasmExpressionWithPostStatements;



// any expressions that have post staements to run immediately after the expression
export interface WasmExpressionWithPostStatements extends WasmAstNode {
  type: "ExpressionWithPostStatements";
  expr: WasmExpression;
  postStatements: (WasmStatement | WasmMemoryLoad)[];
}




