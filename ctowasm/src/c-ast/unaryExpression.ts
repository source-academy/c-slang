/**
 * Definition for unary expression nodes.
 */

import { Expression } from "~src/c-ast/core";
import { VariableExpr } from "~src/c-ast/variable";
import { ArithemeticUnaryOperator, UnaryOperator } from "~src/common/types";

export interface PrefixArithmeticExpression extends Expression {
  type: "PrefixArithmeticExpression";
  operator: ArithemeticUnaryOperator;
  variable: VariableExpr; // the variable being prefix operated on
}

export interface PostfixArithmeticExpression extends Expression {
  type: "PostfixArithmeticExpression";
  operator: ArithemeticUnaryOperator;
  variable: VariableExpr;
}

export interface UnaryExpression extends Expression {
  type: "UnaryExpression";
  operator: UnaryOperator;
  expression: Expression;
}
