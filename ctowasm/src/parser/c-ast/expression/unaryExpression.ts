/**
 * Definition for unary expression nodes.
 */

import { PostfixOperator, PrefixOperator, ScalarCDataType } from "~src/common/types";
import { CNodeBase, Expression } from "~src/parser/c-ast/core";
import { DataType, PrimaryDataType } from "~src/parser/c-ast/dataTypes";

type UnaryExpression =
  | PostfixExpression
  | PrefixExpression
  | FunctionCall
  | StructMemberAccess
  | PointerDereference
  | AddressOfExpression
  | SizeOfExpression
  | TypeCastingExpression;

export default UnaryExpression;
// All unary expressions should inherit this (like function calls)
// "expr" represents the expression being operated on
export interface UnaryExpressionBase extends CNodeBase {
  expr: Expression;
}

export interface PostfixExpression extends UnaryExpressionBase {
  type: "PostfixExpression";
  operator: PostfixOperator;
}

export interface TypeCastingExpression extends UnaryExpressionBase {
  type: "TypeCastingExpression";
  expr: Expression;
  targetDataType: PrimaryDataType;
}

export interface PrefixExpression extends UnaryExpressionBase {
  type: "PrefixExpression";
  operator: PrefixOperator;
}

/**
 * Special variants of PostfixExpression.
 */
export interface FunctionCall extends UnaryExpressionBase {
  type: "FunctionCall";
  expr: Expression;
  args: Expression[];
}

export interface StructMemberAccess extends UnaryExpressionBase {
  type: "StructMemberAccess";
  expr: Expression; // the struct being accessed
  fieldTag: string; // tag of the field being accessed
}

/**
 * Special variants of PrefixExpression.
 */

export interface PointerDereference extends CNodeBase {
  type: "PointerDereference";
  expr: Expression; // the expression being dereferenced
}

export interface AddressOfExpression extends CNodeBase {
  type: "AddressOfExpression";
  expr: Expression; // the expression whose address is being dereferenced. Must be an lvalue.
}

export type SizeOfExpression =
  | SizeOfExpressionExpression
  | SizeOfDataTypeExpression;

interface SizeOfExpressionBase extends CNodeBase {
  type: "SizeOfExpression";
  subtype: "expression" | "dataType"; // whether this sizeof is of a data type or an expression
}
interface SizeOfExpressionExpression extends SizeOfExpressionBase {
  subtype: "expression";
  expr: Expression;
}
interface SizeOfDataTypeExpression extends SizeOfExpressionBase {
  subtype: "dataType";
  dataType: DataType;
}
