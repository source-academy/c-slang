/**
 * A collection of common types used across compiler pipeline modules.
 */

export type RelationalOperator = "<" | "<=" | "!=" | "==" | ">=" | ">";
export type ArithmeticOperator = "+" | "-" | "/" | "*" | "%";
export type LogicalBinaryOperator = "&&" | "||";
export type BitwiseBinaryOperator = ">>" | "<<" | "&" | "|" | "^";
export type BinaryOperator =
  | RelationalOperator
  | ArithmeticOperator
  | LogicalBinaryOperator
  | BitwiseBinaryOperator;

export type ArithemeticUnaryOperator = "++" | "--";
export type PrefixOperator = "!" | "~" | "-";

export type PrimaryCDataType = IntegerDataType | FloatDataType;
export type IntegerDataType = SignedIntegerType | UnsignedIntegerType;
export type UnsignedIntegerType =
  | "unsigned char"
  | "unsigned short"
  | "unsigned int"
  | "unsigned long";
export type SignedIntegerType =
  | "signed char"
  | "signed short"
  | "signed int"
  | "signed long";

export type FloatDataType = "float" | "double";

/**
 * Definition for objects containing information of different types of variables.
 * All information on a type is contained within these interfaces.
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
