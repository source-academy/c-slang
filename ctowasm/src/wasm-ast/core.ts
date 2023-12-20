import {
  WasmSelectStatement,
  WasmLoop,
  WasmBranchIf,
  WasmBranch,
  WasmBlock,
} from "~src/wasm-ast/control";
import {
  WasmFunction,
  WasmFunctionCallStatement,
  WasmReturnStatement,
  WasmRegularFunctionCallStatement,
  WasmImportedFunction,
} from "~src/wasm-ast/functions";
import {
  WasmDataSegmentVariable,
  WasmDataSegmentArray,
  WasmMemoryStore,
  WasmMemoryGrow,
} from "~src/wasm-ast/memory";
import { WasmType } from "~src/wasm-ast/types";
import {
  WasmGlobalSet,
  WasmLocalSet,
  WasmGlobalVariable,
} from "~src/wasm-ast/variables";

/**
 * Main file containing all the core wasm AST node definitions.
 */
export interface WasmAstNode {
  type: string;
}

export interface WasmModule extends WasmAstNode {
  type: "Module";
  globals: Record<string, WasmDataSegmentVariable | WasmDataSegmentArray>;
  globalWasmVariables: WasmGlobalVariable[];
  functions: Record<string, WasmFunction>;
  memorySize: number; // number of pages of memory needed for this module
  importedFunctions: Record<string, WasmImportedFunction>;
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
  | WasmRegularFunctionCallStatement;

/**
 * A special type of statement that results in 1 value being put on the stack,
 * in effect behaving like a WasmExpression.
 *
 * Currently this is only enabled for setting statements, to allowing postfix/prefix operators to work.
 */
export type WasmExprStatement = WasmLocalSet | WasmGlobalSet | WasmMemoryStore;

/**
 * Expressions are Wasm instructions that push a variable to the virtual wasm stack for use in a statement.
 */
export interface WasmExpression extends WasmAstNode {
  wasmVariableType: WasmType; // the type of this expression
}

export interface WasmIntegerConst extends WasmExpression {
  type: "IntegerConst";
  value: bigint;
}

export interface WasmFloatConst extends WasmExpression {
  type: "FloatConst";
  value: number;
}
