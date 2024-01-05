/**
 * Definitions of AST nodes for assignments.
 */

import { CNodeBase, Expression } from "~src/parser/c-ast/core";
import { ArrayElementExpr, VariableExpr } from "~src/parser/c-ast/variable";

// A variable assignment
export interface Assignment extends CNodeBase {
  type: "Assignment";
  variable: VariableExpr | ArrayElementExpr ;
  value: Expression;
}

/**
 * For the case when an assignment is used as an expression.
 */
export interface AssignmentExpression extends CNodeBase {
  type: "AssignmentExpression";
  variable: VariableExpr | ArrayElementExpr;
  value: Expression;
}
