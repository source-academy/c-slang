import { WasmConst } from "~src/translator/wasm-ast/consts";
import {
  WasmSelectionStatement,
  WasmLoop,
  WasmBranchIf,
  WasmBranch,
  WasmBlock,
  WasmBranchTable,
} from "~src/translator/wasm-ast/control";
import {
  WasmBinaryExpression,
  WasmConditionalExpression,
  WasmNegateFloatExpression,
  WasmPostStatementExpression,
  WasmPreStatementExpression,
} from "~src/translator/wasm-ast/expressions";
import {
  WasmFunction,
  WasmReturnStatement,
  WasmImportedFunction,
  WasmFunctionCall,
  WasmRegularFunctionCall,
  WasmIndirectFunctionCall,
} from "~src/translator/wasm-ast/functions";
import {
  WasmMemoryStore,
  WasmMemoryGrow,
  WasmMemoryLoad,
  WasmMemorySize,
  WasmMemoryStoreFromWasmStack,
} from "~src/translator/wasm-ast/memory";
import { WasmBooleanExpression } from "./expressions";
import { WasmNumericConversionWrapper } from "./numericConversion";
import {
  WasmGlobalGet,
  WasmGlobalSet,
  WasmGlobalVariable,
  WasmLocalGet,
  WasmLocalSet,
} from "~src/translator/wasm-ast/variables";
import { WasmFunctionTable } from "~src/translator/wasm-ast/functionTable";

/**
 * Main file containing all the core wasm AST node definitions.
 */
export interface WasmAstNode {
  type: string;
}

export interface WasmModule extends WasmAstNode {
  type: "Module";
  dataSegmentByteStr: string; // string of bytes to set the data segment with
  globalWasmVariables: WasmGlobalVariable[];
  functions: Record<string, WasmFunction>;
  memorySize: number; // number of pages of memory needed for this module
  importedFunctions: WasmImportedFunction[];
  functionTable: WasmFunctionTable;
}

// A wasm statement is an instruction meant to be used in a situation that does not involve a value being pushed on virtual wasm stack.
export type WasmStatement =
  | WasmGlobalSet
  | WasmLocalSet
  | WasmSelectionStatement
  | WasmReturnStatement
  | WasmLoop
  | WasmBranchIf
  | WasmBranch
  | WasmBranchTable
  | WasmBlock
  | WasmMemoryStore
  | WasmMemoryStoreFromWasmStack
  | WasmMemoryGrow
  | WasmRegularFunctionCall
  | WasmFunctionCall
  | WasmIndirectFunctionCall;

/**
 * Wasm Expressions which consist of 1 instruction pushing 1 wasm value to the stack.
 */
export type WasmExpression =
  | WasmConst
  | WasmBinaryExpression
  | WasmNegateFloatExpression
  | WasmMemoryLoad
  | WasmMemorySize
  | WasmBooleanExpression
  | WasmNumericConversionWrapper
  | WasmLocalGet
  | WasmGlobalGet
  | WasmPreStatementExpression
  | WasmPostStatementExpression
  | WasmConditionalExpression;
