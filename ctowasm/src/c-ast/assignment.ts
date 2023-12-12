/**
 * Definitions of AST nodes for assignments.
 */

import { CNode, Expression } from "~src/c-ast/root";
import { ArrayElementExpr } from "~src/c-ast/arrays";
import { VariableExpr } from "~src/c-ast/variable";

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
