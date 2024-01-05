/**
 * Definitions of AST nodes for assignments.
 */

import { CNodeBase, Expression } from "~src/parser/c-ast/core";

// A variable assignment
export interface Assignment extends CNodeBase {
  type: "Assignment";
  lvalue: Expression; //
  value: Expression;
}

/**
 * For the case when an assignment is used as an expression.
 */
export interface AssignmentExpression extends CNodeBase {
  type: "AssignmentExpression";
  lvalue: Expression;
  value: Expression;
}
