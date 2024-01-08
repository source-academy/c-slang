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