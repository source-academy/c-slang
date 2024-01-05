import { PrimaryCDataType } from "~src/common/types";

/**
 * Definition for objects containing information of different types of variables.
 * All information on a type is contained within these interfaces.
 * Used in the processor symbol table, as well as for type checking.
 */

export type DataType =
  | ScalarDataType
  | ArrayDataType
  | StructDataType
  | TypedefDataType;

export type ScalarDataType = PrimaryDataType | PointerDataType;

export interface PrimaryDataType {
  type: "primary";
  primaryDataType: PrimaryCDataType;
}

export interface ArrayDataType {
  type: "array";
  elementDataType: DataType;
  numElements: number;
}

export interface PointerDataType {
  type: "pointer";
  // type of the object being pointed to
  pointeeType: DataType;
}

export interface FunctionDataType {
  type: "function";
  returnType: DataType | null;
  parameters: DataType[];
}

export interface StructDataType {
  type: "struct";
}
/**
 * User defined types using typedef.
 */

export interface TypedefDataType {
  type: "typedef";
}
