import { BinaryOperator, ComparisonOperator } from "c-ast/c-nodes";
import { Scopes } from "wasm-ast/types";

/**
 * This file contains all the typescript definitions for the nodes of the wasm AST.
 */
export type WasmType = "i32" | "i64" | "f32" | "f64";

export interface WasmAstNode {
  type: string;
}

export interface WasmVariable extends WasmAstNode {
  name: string; // not technically needed for wasm, but useful
  isConst?: boolean; // TODO: to support later on
  varType: WasmType;
}

/**
 * A variable that is meant to be stored in memory.
 */
export interface WasmMemoryVariable extends WasmAstNode {
  name: string;
  size: number; // size in bytes of this variable
  varType: WasmType; // the wasm type to use when loading/storing this variable
}

export interface WasmLocalVariable extends WasmMemoryVariable {
  type: "LocalVariable" | "FunctionParameter";
  bpOffset: number; // offset in number of bytes from base pointer
}

export interface WasmFunctionParameter extends WasmLocalVariable {
  type: "FunctionParameter";
  paramIndex: number; // index of this param in the list of params of the function
}

/**
 * Global variables will be in the 'data' segment of memory.
 */
export interface WasmDataSegmentVariable extends WasmMemoryVariable {
  type: "DataSegmentVariable";
  initializerValue?: WasmConst; // initial value to set this global value to
  memoryAddr: number; // offset from start of memory that this variable is at
}

/**
 * Actual WASM globals variables.
 */
export interface WasmGlobalVariable extends WasmVariable {
  type: "GlobalVariable";
  initializerValue?: WasmConst;
}

export interface WasmConst extends WasmAstNode {
  type: "Const";
  variableType: WasmType;
  value: number;
}

export interface WasmModule extends WasmAstNode {
  type: "Module";
  globals: Record<string, WasmDataSegmentVariable>;
  globalWasmVariables: WasmGlobalVariable[];
  functions: Record<string, WasmFunction>;
  memorySize: number; // number of pages of memory needed for this module
}

export type WasmFunctionBodyLine = WasmStatement | WasmExpression;

export interface WasmFunction extends WasmAstNode {
  type: "Function";
  name: string;
  params: Record<string, WasmFunctionParameter>;
  locals: Record<string, WasmLocalVariable>;
  returnVariable: WasmMemoryVariable | null; // the return of this function, null if it does not return anything
  sizeOfLocals: number;
  sizeOfParams: number;
  loopCount: number; // count of the loops in this function. used for giving unique label names to loops
  blockCount: number; // same as loopCount, but for WasmBlocks
  scopes: Scopes;
  body: WasmFunctionBodyLine[];
  bpOffset: number; // current offset from base pointer, initially 0
}

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
  | WasmLog;

// TODO: figure out if this necessary
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
  | WasmLocalTee
  | WasmMemoryLoad
  | WasmMemorySize
  | WasmExpressionWithPostStatements;

/**
 * Tee is an assignment expression that loads the assigned value back onto stack
 */
export interface WasmLocalTee {
  type: "LocalTee";
  name: string;
  value: WasmExpression;
}

export interface WasmReturnStatement {
  type: "ReturnStatement";
}

export interface WasmFunctionCall extends WasmAstNode {
  type: "FunctionCall";
  name: string;
  stackFrameSetup: WasmStatement[]; // wasm statements to set up the stack for this wasm function call (params, and locals)
  stackFrameTearDown: (WasmStatement | WasmMemoryLoad)[]; // statements teardown the stack frame
}

export interface WasmFunctionCallStatement extends WasmAstNode {
  type: "FunctionCallStatement";
  name: string;
  stackFrameSetup: WasmStatement[]; // wasm statements to set up the stack for this wasm function call (params, and locals)
  stackFrameTearDown: (WasmStatement | WasmMemoryLoad)[]; // statements teardown the stack frame
}

/**
 * A function call to the $log function. for testing purposes only.
 */
export interface WasmLog extends WasmAstNode {
  type: "Log";
  value: WasmExpression; // the value to log
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

export interface WasmLocalGet extends WasmAstNode {
  type: "LocalGet";
  name: string;
  preStatements?: (WasmStatement | WasmExpression)[];
}

export interface WasmGlobalGet extends WasmAstNode {
  type: "GlobalGet";
  name: string;
  preStatements?: (WasmStatement | WasmExpression)[];
}

export type MemoryVariableByteSize = 1 | 4 | 8;

export interface WasmMemoryLoad extends WasmAstNode {
  type: "MemoryLoad";
  addr: WasmExpression; // the offset in memory to load from
  varType: WasmType; // wasm var type for the store instruction
  numOfBytes: MemoryVariableByteSize; // number of bytes to store
  preStatements?: (WasmStatement | WasmExpression)[];
}

export interface WasmMemoryStore extends WasmAstNode {
  type: "MemoryStore";
  addr: WasmExpression;
  value: WasmExpression;
  varType: WasmType; // wasm var type for the store instruction
  numOfBytes: MemoryVariableByteSize; // number of bytes to store
  preStatements?: (WasmStatement | WasmExpression)[];
}

export interface WasmMemoryGrow extends WasmAstNode {
  type: "MemoryGrow";
  pagesToGrowBy: WasmExpression;
}

export interface WasmMemorySize extends WasmAstNode {
  type: "MemorySize";
}

export interface WasmArithmeticExpression extends WasmAstNode {
  type: "ArithmeticExpression";
  operator: BinaryOperator;
  leftExpr: WasmExpression;
  rightExpr: WasmExpression;
  varType: WasmType; // the type of the variables that the arithmetic expression is running
}

// any expressions that have post staements to run immediately after the expression
export interface WasmExpressionWithPostStatements extends WasmAstNode {
  type: "ExpressionWithPostStatements";
  expr: WasmExpression;
  postStatements: (WasmStatement | WasmMemoryLoad)[];
}

/**
 * A special type of statement that results in 1 value being put on the stack,
 * in effect behaving like a WasmExpression.
 *
 * Currently this is only enabled for setting statements, to allowing postfix/prefix operators to work.
 */
export type WasmExprStatement = WasmLocalSet | WasmGlobalSet | WasmMemoryStore;

/**
 * Forms a wrapper around a regular wasm expression, to indicate that it is to be
 * used as a boolean expression.
 */
export interface WasmBooleanExpression extends WasmAstNode {
  type: "BooleanExpression";
  expr: WasmExpression;
  isNegated?: boolean; // set to true to negate the boolean value
}

export interface WasmAndExpression extends WasmAstNode {
  type: "AndExpression";
  leftExpr: WasmAndExpression | WasmBooleanExpression;
  rightExpr: WasmBooleanExpression;
}

/**
 * Bitwise OR.
 */
export interface WasmOrExpression extends WasmAstNode {
  type: "OrExpression";
  leftExpr: WasmOrExpression | WasmAndExpression | WasmBooleanExpression;
  rightExpr: WasmAndExpression | WasmBooleanExpression;
}

export interface WasmComparisonExpression extends WasmAstNode {
  type: "ComparisonExpression";
  operator: ComparisonOperator;
  leftExpr: WasmExpression;
  rightExpr: WasmExpression;
}

export interface WasmSelectStatement extends WasmAstNode {
  type: "SelectStatement";
  condition: WasmExpression;
  actions: WasmStatement[];
  elseStatements: WasmStatement[];
}

export interface WasmLoop extends WasmAstNode {
  type: "Loop";
  label: string;
  body: WasmStatement[];
}

export interface WasmBranchIf extends WasmAstNode {
  type: "BranchIf";
  label: string; // the label to jump to
  condition: WasmExpression;
}

export interface WasmBranch extends WasmAstNode {
  type: "Branch";
  label: string;
}

export interface WasmBlock extends WasmAstNode {
  type: "Block";
  label: string;
  body: WasmStatement[];
}
