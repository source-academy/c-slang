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
  | FunctionDataType
  | EnumDataType;

export type ScalarDataType = PrimaryDataType | PointerDataType;

export interface DataTypeBase {
  isConst?: boolean; // indicates if the given datatype has const qualifier
}

export interface PrimaryDataType extends DataTypeBase {
  type: "primary";
  primaryDataType: PrimaryCDataType;
}

export interface ArrayDataType extends DataTypeBase {
  type: "array";
  elementDataType: DataType;
  numElements: Expression;
}

export interface PointerDataType extends DataTypeBase {
  type: "pointer";
  // type of the object being pointed to
  pointeeType: DataType | null; // when this is null it represents a void pointer
}

export interface FunctionDataType extends DataTypeBase {
  type: "function";
  returnType: DataType | null;
  parameters: DataType[];
}

export interface StructDataType extends DataTypeBase {
  type: "struct";
  tag: string | null; // tag of this struct. May be null for anonymous structs. Essential for determining struct compatibility.
  fields: StructField[];
}

/**
 * Enum types are defined in this implementation as "signed int".
 */
export interface EnumDataType extends DataTypeBase {
  type: "enum";
  tag: string | null;
}

interface StructField {
  tag: string;
  dataType: DataType | StructSelfPointer;
}

/**
 * A SelfPointer refers to a pointer that is a present as a struct field that points to the struct it is within.
 * This separation from the generic PointerDataType prevents the creation of a cyclic AST structure where the pointeeType
 * of the PointerDataType is equal to the StructDataType which contains the pointer as one of its fields.
 */
export interface StructSelfPointer {
  type: "struct self pointer";
}
