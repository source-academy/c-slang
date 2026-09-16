/**
 * Definitions of AST nodes for assignments.
 */

import { CNodeBase, Expression } from "~src/parser/c-ast/core";

// An assignment of expr to an lvalue
export interface Assignment extends CNodeBase {
  type: "Assignment";
  lvalue: Expression; // only lvalues can be assigned to
  expr: Expression;
}
