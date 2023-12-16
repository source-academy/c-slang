/**
 * Definitions of AST nodes for assignments.
 */

import { CNode, Expression } from "~src/c-ast/core";
import { ArrayElementExpr } from "~src/c-ast/arrays";
import { VariableExpr } from "~src/c-ast/variable";
import { ArithmeticOperator } from "~src/common/types";

// A variable assignment
export interface Assignment extends CNode {
  type: "Assignment";
  variable: VariableExpr | ArrayElementExpr;
  value: Expression;
}

/**
 * For the case when an assignment is used as an expression.
 */
export interface AssignmentExpression extends Expression {
  type: "AssignmentExpression";
  variable: VariableExpr | ArrayElementExpr;
  value: Expression;
}

export interface CompoundAssignment extends CNode {
  type: "CompoundAssignment";
  operator: ArithmeticOperator;
  variable: VariableExpr | ArrayElementExpr;
  value: Expression;
}

export interface CompoundAssignmentExpression extends Expression {
  type: "CompoundAssignmentExpression";
  operator: ArithmeticOperator;
  variable: VariableExpr | ArrayElementExpr;
  value: Expression;
}
