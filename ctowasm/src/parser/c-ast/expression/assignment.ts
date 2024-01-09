/**
 * Definitions of AST nodes for assignments.
 */

import { CNodeBase, Expression } from "~src/parser/c-ast/core";

// A variable assignment
export interface Assignment extends CNodeBase {
  type: "Assignment";
  lvalue: Expression; // only lvalues can be assigned to
  value: Expression;
}
