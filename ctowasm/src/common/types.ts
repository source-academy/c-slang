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
export type UnaryOperator = "!" | "~" | "-";

export type PrimaryCDataType = IntegerVariableType | FloatVariableType;
export type IntegerVariableType = SignedIntegerType | UnsignedIntegerType;
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

export type FloatVariableType = "float" | "double";

/**
 * Definition for objects containing information of different types of variables.
 * All information on a type is contained within these interfaces.
 */
export type VariableType = PrimaryVariableType | PointerVariableType | StructVariableType |TypeDefVariableType

export interface PrimaryVariableType {
  type: "primary";
  primaryDataType: PrimaryCDataType;
}

export interface ArrayVariableType {
  type: "array";
  elementDataType: VariableType;
  numElements: number;
}

export interface PointerVariableType {
  type: "pointer";
  // type of the object being pointed to
  pointeeType: VariableType;
}

export interface FunctionVariableType {
  type: "function";
  returnType: VariableType | null;
  parameters: VariableType[];
}

export interface StructVariableType {
  type: "struct";
}

/**
 * User defined types using typedef.
 */
export interface TypeDefVariableType {
  type: "typedef";
}