/**
 * Definition for unary expression nodes.
 */

import { Expression } from "~src/c-ast/core";
import { ArrayElementExpr } from "~src/c-ast/arrays";
import { VariableExpr } from "~src/c-ast/variable";
import { UnaryOperator } from "~src/common/types";

export interface PrefixExpression extends Expression {
  type: "PrefixExpression";
  operator: UnaryOperator;
  variable: VariableExpr | ArrayElementExpr; // the variable being prefix operated on
}

export interface PostfixExpression extends Expression {
  type: "PostfixExpression";
  operator: UnaryOperator;
  variable: VariableExpr | ArrayElementExpr;
}

