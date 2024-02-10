/**
 * Definitions of all nodes relating to memory operations.
 */

import { ScalarCDataType } from "~src/common/types";
import { ExpressionP, ExpressionPBase } from "~src/processor/c-ast/core";
import { IntegerConstantP } from "~src/processor/c-ast/expression/constants";

/**
 * Types of addresses. Each address represents the address of a specific primary data type object in memory.
 */
export type Address =
  | LocalAddress
  | DataSegmentAddress
  | DynamicAddress
  | ReturnObjectAddress
  | FunctionTableIndex;

export interface AddressBase extends ExpressionPBase {
  dataType: "pointer"; // all addresses should have pointer type
}

// this covers local variables and parameters in a functions.
//
export interface LocalAddress extends AddressBase {
  type: "LocalAddress";
  offset: IntegerConstantP;
}

// covers data segment (global) variables
export interface DataSegmentAddress extends AddressBase {
  type: "DataSegmentAddress";
  offset: IntegerConstantP; // represents the number of bytes of this address from the first byte of the first data segment object
}

export interface DynamicAddress extends AddressBase {
  type: "DynamicAddress";
  address: ExpressionP; // represents the exact address itself
}

/**
 * Index of a function within the SymbolTable.functionTable - i.e. its "address"
 */
export interface FunctionTableIndex extends AddressBase {
  type: "FunctionTableIndex";
  index: IntegerConstantP;
}

// represents the address of a primary data object that is part of a return object of a function
// this is not an lvalue
export type ReturnObjectAddress =
  | ReturnObjectAddressStore
  | ReturnObjectAddressLoad;

interface ReturnObjectAddressBase extends AddressBase {
  type: "ReturnObjectAddress";
  subtype: "store" | "load"; // represents the context that the return address is being use in - this is needed as this determines how the actual adderss is calcualted (from which psuedo register)
  offset: IntegerConstantP;
}

// calculated relative to Base Pointer in the translator (BP + AddressSize + offset) -> offset will be positive
interface ReturnObjectAddressStore extends ReturnObjectAddressBase {
  subtype: "store";
}

// calculated relative to Stack Pointer in the translator (SP - offset) -> offset will be negative
interface ReturnObjectAddressLoad extends ReturnObjectAddressBase {
  subtype: "load";
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
