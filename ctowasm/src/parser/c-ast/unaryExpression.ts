/**
 * Definition for unary expression nodes.
 */

import { ArithemeticUnaryOperator, PrefixOperator } from "~src/common/types";
import { CNodeBase, Expression } from "~src/parser/c-ast/core";

export interface PrefixArithmeticExpression extends UnaryExpressionBase {
  type: "PrefixArithmeticExpression";
  operator: ArithemeticUnaryOperator;
}

export interface PostfixArithmeticExpression extends UnaryExpressionBase {
  type: "PostfixArithmeticExpression";
  operator: ArithemeticUnaryOperator;
}

export interface PrefixExpression extends UnaryExpressionBase {
  type: "PrefixExpression";
  operator: PrefixOperator;
}

// All unary expressions should inherit this (like function calls)
// "expr" represents the expression being operated on
export interface UnaryExpressionBase extends CNodeBase {
  expr: Expression;
}
