import { CNodePBase, ExpressionP, StatementP } from "~src/processor/c-ast/core";
import { BinaryExpressionP } from "~src/processor/c-ast/expression/expressions";

export interface SelectionStatementP extends CNodePBase {
  type: "SelectionStatement";
  condition: ExpressionP;
  ifStatements: StatementP[];
  elseStatements: StatementP[] | null;
}

export interface SwitchStatementP {
  type: "SwitchStatement";
  targetExpression: ExpressionP;
  cases: SwitchStatementCaseP[];
  defaultStatements: StatementP[];
}

export interface SwitchStatementCaseP {
  condition: BinaryExpressionP;
  statements: StatementP[];
}
