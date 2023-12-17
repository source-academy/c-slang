/**
 * A collection of common types used across compiler pipeline modules.
 */

export type RelationalOperator = "<" | "<=" | "!=" | "==" | ">=" | ">";
export type ArithmeticOperator = "+" | "-" | "/" | "*" | "%";
export type LogicalOperator = "&&" | "||"
export type BinaryOperator = RelationalOperator | ArithmeticOperator | LogicalOperator

export type UnaryOperator = "++" | "--";

export type VariableType = IntegerType;
export type IntegerType = SignedIntegerType | UnsignedIntegerType;
export type UnsignedIntegerType = "unsigned char" | "unsigned short" | "unsigned int" | "unsigned long";
export type SignedIntegerType = "signed char" | "signed short" | "signed int" | "signed long";