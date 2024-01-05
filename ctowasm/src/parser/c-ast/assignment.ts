/**
 * Definitions of AST nodes for assignments.
 */

import { CNodeBase, Expression } from "~src/parser/c-ast/core";
import { LValue } from "~src/parser/c-ast/variable";

// A variable assignment
export interface Assignment extends CNodeBase {
  type: "Assignment";
  lvalue: LValue; // only lvalues can be assigned to
  value: Expression;
}

/**
 * For the case when an assignment is used as an expression.
 */
export interface AssignmentExpression extends CNodeBase {
  type: "AssignmentExpression";
  lvalue: LValue;
  value: Expression;
}
