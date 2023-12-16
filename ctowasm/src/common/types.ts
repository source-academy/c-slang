/**
 * A collection of common types used across compiler pipeline modules.
 */

export type RelationalOperator = "<" | "<=" | "!=" | "==" | ">=" | ">";
export type ArithmeticOperator = "+" | "-" | "/" | "*" | "%";
export type LogicalOperator = "&&" | "||"
export type BinaryOperator = RelationalOperator | ArithmeticOperator | LogicalOperator

export type UnaryOperator = "++" | "--";

export type VariableType = IntegerType;
export type IntegerType = "char" | "short" | "int" | "long";