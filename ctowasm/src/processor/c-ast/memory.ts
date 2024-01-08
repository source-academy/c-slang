/**
 * Definitions of all nodes relating to memory operations.
 */

import { ScalarCDataType } from "~src/common/types";
import {
  CNodePBase,
  ExpressionP,
  ExpressionPBase,
} from "~src/processor/c-ast/core";

export type MemoryLoad =
  | LocalObjectMemoryLoad
  | DataSegmentObjectMemoryLoad
  | FunctionReturnMemoryLoad;
export type MemoryStore =
  | LocalObjectMemoryStore
  | FunctionReturnMemoryStore
  | DataSegmentObjectMemoryStore;

// Represents expressions that correspond to addresses in memory.
export type ObjectMemoryAddress = LocalObjectMemoryAddress | DataSegmentObjectMemoryAddress

interface ScalarDataTypeObjectMemoryDetails {
  dataType: ScalarCDataType;
  offset: ExpressionP; // offset from the first byte of the first local object
}

/**
 * Represents the storing of the value of an expression to the memory location that defines
 * a local variable, which consists of locally defined variables in a function, and the function parameters.
 * Thus local variables and function parameters are assumed to be laid out contiguously in memory, with function parameters first.
 *
 * Memory storing is with regards to primary data types - storage of aggregate data types are broken up into multipl
 * LocalVariableMemoryStore nodes.
 */
export interface LocalObjectMemoryStore
  extends ScalarDataTypeObjectMemoryDetails,
    CNodePBase {
  type: "LocalObjectMemoryStore";
  value: ExpressionP;
}

export interface LocalObjectMemoryLoad
  extends ScalarDataTypeObjectMemoryDetails,
    ExpressionPBase {
  type: "LocalObjectMemoryLoad";
}

/**
 * Represents a specific location in the stack frame,
 * relative to the first byte of the first local variable (function parameter or local function variable)
 */
export interface LocalObjectMemoryAddress extends ExpressionPBase {
  type: "LocalObjectMemoryAddress";
  dataType: "pointer",
  offset: number;
}

/**
 * Represents storing of the return primary data object of a function.
 * Functions that return structs may have multiple of these as structs are composed of multiple primary data types.
 */
export interface FunctionReturnMemoryStore
  extends ScalarDataTypeObjectMemoryDetails,
    CNodePBase {
  type: "FunctionReturnMemoryStore";
  value: ExpressionP;
}

/**
 * To be used only after function calls where return is used.
 * Represents the loading of a primary data type (of which the return object may be composed of a number of).
 */
export interface FunctionReturnMemoryLoad
  extends ExpressionPBase,
    ScalarDataTypeObjectMemoryDetails {
  type: "FunctionReturnMemoryLoad";
}

/**
 * Represents the storing of a primary data object in the data segment. (static storage)
 */
export interface DataSegmentObjectMemoryStore
  extends ScalarDataTypeObjectMemoryDetails,
    CNodePBase {
  type: "DataSegmentObjectMemoryStore";
  value: ExpressionP;
}

export interface DataSegmentObjectMemoryLoad
  extends ScalarDataTypeObjectMemoryDetails,
    ExpressionPBase {
  type: "DataSegmentObjectMemoryLoad";
}

export interface DataSegmentObjectMemoryAddress extends ExpressionPBase {
  type: "DataSegmentObjectMemoryAddress",
  offset: number;
}

/**
 * Represents the loading of specific memory address specified by the expression.
 */
export interface MemoryAddressExpressionLoad extends ExpressionPBase {
  type: "DataSegmenetMemoryAddress";
  offset: ExpressionP;
}


export interface MemoryObjectDetail {
  dataType: ScalarCDataType;
  offset: number; // for param - offset from first byte of first param ; for return - offset from first byte of first return
}
