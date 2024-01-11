import { CNodePBase } from "~src/processor/c-ast/core";

export type JumpStatementP = ReturnStatementP | BreakStatementP | ContinueStatementP

export interface ReturnStatementP extends CNodePBase {
  type: "ReturnStatement";
}

export interface BreakStatementP extends CNodePBase {
  type: "BreakStatement";
}

export interface ContinueStatementP extends CNodePBase {
  type: "ContinueStatement";
}
