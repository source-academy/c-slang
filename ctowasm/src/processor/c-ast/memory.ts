/**
 * Definitions of all nodes relating to memory operations.
 */

import { ScalarCDataType } from "~src/common/types";
import {
  ExpressionP,
  ExpressionPBase,
} from "~src/processor/c-ast/core";
import { IntegerConstantP } from "~src/processor/c-ast/expression/constants";

/**
 * Types of addresses. Each address represents the address of a specific primary data type object in memory.
 */
export type Address = LocalAddress | DataSegmentAddress | DynamicAddress;

// this covers local variables and parameters in a functions.
//
export interface LocalAddress extends ExpressionPBase {
  type: "LocalAddress";
  offset: ExpressionP; 
}

// covers data segment (global) variables
export interface DataSegmentAddress extends ExpressionPBase {
  type: "DataSegmentAddress";
  offset: ExpressionP; // represents the number of bytes of this address from the first byte of the first data segment object
}

export interface DynamicAddress extends ExpressionPBase {
  type: "DynamicAddress";
  address: ExpressionP; // represents the exact address itself
}

/**
 * Nodes that represent interactions with objects in memory.
 */

// Represents the loading of a primary data type object in an address in memory
export interface MemoryLoad extends ExpressionPBase {
  type: "MemoryLoad";
  address: Address;
}

// Represents the storing of a primary data type object in an address in memory
export interface MemoryStore {
  type: "MemoryStore";
  address: Address;
  value: ExpressionP;
  dataType: ScalarCDataType;
}

// Special node for handling loading of return object in memory, since return object is not an lvalue.
export interface FunctionReturnMemoryLoad extends ExpressionPBase {
  type: "FunctionReturnMemoryLoad";
  offset: IntegerConstantP; // number of  bytes from address of last byte + 1 of LAST return primary data type memory object
}

// Special node for handling storing of return in memory.
export interface FunctionReturnMemoryStore {
  type: "FunctionReturnMemoryStore";
  offset: IntegerConstantP; // number of bytes from first byte of first return primary data type memory object (since an entire return object may be broken into multiple primary data types eg for returning structs)
  value: ExpressionP;
  dataType: ScalarCDataType;
}
