/**
 * Definitions for select statement.
 */

import { CNodeBase, Expression, Statement } from "~src/parser/c-ast/core";

export interface SelectionStatement extends CNodeBase {
  type: "SelectionStatement";
  condition: Expression;
  ifStatement: Statement;
  elseStatement?: Statement;
}
