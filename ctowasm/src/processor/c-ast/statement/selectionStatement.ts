import { CNodePBase, ExpressionP, StatementP } from "~src/processor/c-ast/core";

export interface SelectionStatementP extends CNodePBase {
  type: "SelectionStatement";
  condition: ExpressionP;
  ifStatements: StatementP[];
  elseStatements: StatementP[] | null;
}

export interface SwitchStatementP {
  type: "SwitchStatement",
  targetExpression: ExpressionP;
  cases: SwitchStatementCaseP[];
  defaultStatements: StatementP[];
}

export interface SwitchStatementCaseP {
  conditionMatch: ExpressionP;
  statements: StatementP[];
}
