/**
 * Contains the definitions for AST nodes relating to arithmetic.
 */

import { Expression, CNode } from "~src/c-ast/root";
import { ArrayElementExpr } from "~src/c-ast/arrays";
import { VariableExpr } from "~src/c-ast/variable";
import { BinaryOperator, UnaryOperator } from "~src/common/constants";

export interface ArithmeticExpression extends Expression {
  type: "ArithmeticExpression";
  firstExpr: Expression;
  exprs: ArithmeticSubExpression[]; // the array of experessions that are joined by the operator
}

// A constituent of a arithmetic expression. contains the operator that attaches this subexpession to the left subexpression.
export interface ArithmeticSubExpression extends Expression {
  type: "ArithmeticSubExpression";
  operator: BinaryOperator;
  expr: Expression;
}

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

export interface CompoundAssignment extends CNode {
  type: "CompoundAssignment";
  operator: BinaryOperator;
  variable: VariableExpr | ArrayElementExpr;
  value: Expression;
}

export interface CompoundAssignmentExpression extends Expression {
  type: "CompoundAssignmentExpression";
  operator: BinaryOperator;
  variable: VariableExpr | ArrayElementExpr;
  value: Expression;
}
