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

export interface SwitchStatement extends CNodeBase {
  type: "SwitchStatement";
  targetExpression: Expression; // the expression being used in conditions
  cases: SwitchStatementCase[];
  defaultStatements: Statement[]; // statements for default case
}

interface SwitchStatementCase {
  conditionMatch: Expression; // the constant expression to match the targetExpression against
  statements: Statement[]; // the statements under this case to run
}
