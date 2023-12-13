/**
 * Definition of AST nodes for conditional constructs.
 */

import { Expression, CNode } from "~src/c-ast/core";
import { ComparisonOperator } from "~src/common/constants";

export interface ConditionalExpression extends Expression {
  type: "ConditionalExpression";
  conditionType: "and" | "or";
  exprs: Expression[];
}

export interface ComparisonExpression extends Expression {
  type: "ComparisonExpression";
  firstExpr: Expression;
  exprs: ComparisonSubExpression[];
}

export interface ComparisonSubExpression extends CNode {
  type: "ComparisonSubExpression";
  operator: ComparisonOperator;
  expr: Expression;
}
