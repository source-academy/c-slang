import {
  WasmConst,
} from "~src/wasm-ast/consts";
import {
  WasmSelectStatement,
  WasmLoop,
  WasmBranchIf,
  WasmBranch,
  WasmBlock,
} from "~src/wasm-ast/control";
import {
  WasmBinaryExpression,
  WasmNegateFloatExpression,
} from "~src/wasm-ast/expressions";
import {
  WasmFunction,
  WasmFunctionCallStatement,
  WasmReturnStatement,
  WasmRegularFunctionCallStatement,
  WasmImportedFunction,
  WasmFunctionCall,
  WasmRegularFunctionCall,
} from "~src/wasm-ast/functions";
import {
  WasmMemoryStore,
  WasmMemoryGrow,
  WasmDataSegmentInitialization,
  WasmMemoryLoad,
  WasmMemorySize,
} from "~src/wasm-ast/memory";
import {
  WasmBooleanExpression,
  WasmNumericConversionWrapper,
} from "~src/wasm-ast/misc";
import {
  WasmGlobalGet,
  WasmGlobalSet,
  WasmGlobalVariable,
  WasmLocalGet,
  WasmLocalSet,
} from "~src/wasm-ast/variables";

/**
 * Main file containing all the core wasm AST node definitions.
 */
export interface WasmAstNode {
  type: string;
}

export interface WasmModule extends WasmAstNode {
  type: "Module";
  dataSegmentInitializations: WasmDataSegmentInitialization[];
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
  | WasmRegularFunctionCallStatement
  | WasmSelectStatement
  | WasmReturnStatement
  | WasmLoop
  | WasmBranchIf
  | WasmBranch
  | WasmBlock
  | WasmMemoryStore
  | WasmMemoryGrow;


/**
 * Wasm Expressions which consist of 1 instruction pushing 1 wasm value to the stack.
 */
type WasmSingleInstructionExpression =
  | WasmConst
  | WasmBinaryExpression
  | WasmNegateFloatExpression
  | WasmFunctionCall
  | WasmRegularFunctionCall
  | WasmMemoryLoad
  | WasmMemorySize
  | WasmBooleanExpression
  | WasmNumericConversionWrapper
  | WasmLocalGet
  | WasmGlobalGet;

/**
 * An expression that consists of multiple instructions, which ultimately push 1 or more variables to the stack.
 * Used for postfix expressions and structs.
 */
export interface WasmMultiInstructionExpression extends WasmAstNode {
  type: "WasmMultiInstructionExpression";
  instructions: (WasmStatement | WasmExpression)[]
}

/**
 * WasmExpressions are instruction(s) that result in 1 or more wasm values being pushed onto the virtual stack.
 */
export type WasmExpression = WasmSingleInstructionExpression | WasmMultiInstructionExpression;


