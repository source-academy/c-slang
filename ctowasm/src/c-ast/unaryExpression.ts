/**
 * Definition for unary expression nodes.
 */

import { Expression } from "~src/c-ast/core";
import { ArrayElementExpr } from "~src/c-ast/arrays";
import { VariableExpr } from "~src/c-ast/variable";
import { UnaryOperator } from "~src/common/types";

export interface PrefixArithmeticExpression extends Expression {
  type: "PrefixArithmeticExpression";
  operator: UnaryOperator;
  variable: VariableExpr | ArrayElementExpr; // the variable being prefix operated on
}

export interface PostfixArithmeticExpression extends Expression {
  type: "PostfixArithmeticExpression";
  operator: UnaryOperator;
  variable: VariableExpr | ArrayElementExpr;
}
