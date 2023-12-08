/**
 * Definition of AST nodes for conditional constructs.
 */

import { Expression, ScopedNode } from "~src/c-ast/root";

export type ComparisonOperator = "<" | "<=" | "!=" | "==" | ">=" | ">";

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

export interface ComparisonSubExpression extends ScopedNode {
  type: "ComparisonSubExpression";
  operator: ComparisonOperator;
  expr: Expression;
}
