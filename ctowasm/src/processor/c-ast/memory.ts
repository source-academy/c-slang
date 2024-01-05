/**
 * Definitions of all nodes relating to memory operations.
 */

import { PrimaryCDataType } from "~src/common/types";
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

interface PrimaryDataTypeObjectMemoryDetails {
  dataType: PrimaryCDataType;
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
  extends PrimaryDataTypeObjectMemoryDetails,
    CNodePBase {
  type: "LocalObjectMemoryStore";
  value: ExpressionP;
}

export interface LocalObjectMemoryLoad
  extends PrimaryDataTypeObjectMemoryDetails,
    ExpressionPBase {
  type: "LocalObjectMemoryLoad";
}

/**
 * Represents storing of the return primary data object of a function.
 * Functions that return structs may have multiple of these as structs are composed of multiple primary data types.
 */
export interface FunctionReturnMemoryStore
  extends PrimaryDataTypeObjectMemoryDetails,
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
    PrimaryDataTypeObjectMemoryDetails {
  type: "FunctionReturnMemoryLoad";
}

/**
 * Represents the storing of a primary data object in the data segment. (static storage)
 */
export interface DataSegmentObjectMemoryStore
  extends PrimaryDataTypeObjectMemoryDetails,
    CNodePBase {
  type: "DataSegmentObjectMemoryStore";
  value: ExpressionP;
}

export interface DataSegmentObjectMemoryLoad
  extends PrimaryDataTypeObjectMemoryDetails,
    ExpressionPBase {
  type: "DataSegmentObjectMemoryLoad";
}
export interface MemoryObjectDetail {
  primaryDataType: PrimaryCDataType;
  offset: number; // for param - offset from first byte of first param ; for return - offset from first byte of first return
}
