/**
 * Definition for unary expression nodes.
 */

import { ArithemeticUnaryOperator, PrefixOperator } from "~src/common/types";
import { CNodeBase, Expression } from "~src/parser/c-ast/core";

// All unary expressions should inherit this (like function calls)
// "expr" represents the expression being operated on
export interface UnaryExpressionBase extends CNodeBase {
  expr: Expression;
}

export interface PostfixArithmeticExpression extends UnaryExpressionBase {
  type: "PostfixArithmeticExpression";
  operator: ArithemeticUnaryOperator;
}

export interface PrefixExpression extends UnaryExpressionBase {
  type: "PrefixExpression";
  operator: PrefixOperator;
}

/**
 * Special variants of PrefixExpression
 */
export interface PrefixArithmeticExpression extends UnaryExpressionBase {
  type: "PrefixArithmeticExpression";
  operator: ArithemeticUnaryOperator;
}

export interface PointerDereference extends CNodeBase {
  type: "PointerDereference";
  expr: Expression; // the expression being dereferenced
}

export interface AddressOfExpression extends CNodeBase {
  type: "AddressOfExpression";
  expr: Expression; // the expression whose address is being dereferenced. Must be an lvalue.
}
