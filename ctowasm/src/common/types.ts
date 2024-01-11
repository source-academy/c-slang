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

export type UnaryOperator = PrefixOperator | PostfixOperator
export type ArithemeticUnaryOperator = "++" | "--";
export type PostfixOperator = ArithemeticUnaryOperator; // excludes struct field access, function calls and array subscripting
export type PrefixOperator = "!" | "~" | "-" | "+" | ArithemeticUnaryOperator; // excludes pointer operators

// These should be the only data types present in the C AST after processing all aggregate type broken into their primary data types)
// Hence these are the only types that the translatar module sees.
export type ScalarCDataType = PrimaryCDataType | PointerCDataType;
export type PointerCDataType = "pointer";
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
