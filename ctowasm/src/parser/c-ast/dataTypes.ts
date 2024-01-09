import { PrimaryCDataType } from "~src/common/types";
import { Expression } from "~src/parser/c-ast/core";

/**
 * Definition for objects containing information of different types of variables.
 * All information on a type is contained within these interfaces.
 * Used in the processor symbol table, as well as for type checking.
 */

export type DataType =
  | ScalarDataType
  | ArrayDataType
  | StructDataType
  | FunctionDataType;

export type ScalarDataType = PrimaryDataType | PointerDataType;

export interface PrimaryDataType {
  type: "primary";
  primaryDataType: PrimaryCDataType;
}

export interface ArrayDataType {
  type: "array";
  elementDataType: DataType;
  numElements: Expression;
}

export interface PointerDataType {
  type: "pointer";
  // type of the object being pointed to
  pointeeType: DataType | null; // when this is null it represents a void pointer
}

export interface FunctionDataType {
  type: "function";
  returnType: DataType | null;
  parameters: DataType[];
}

export interface StructDataType {
  type: "struct";
}
