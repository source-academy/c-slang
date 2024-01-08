import { CNodePBase, ExpressionP, StatementP } from "~src/processor/c-ast/core";

export interface SelectionStatementP extends CNodePBase {
  type: "SelectionStatement";
  ifBlock: ConditionalBlockP;
  elseIfBlocks: ConditionalBlockP[];
  elseBody?: StatementP[] | null;
}

export interface ConditionalBlockP {
  condition: ExpressionP;
  body: StatementP[];
}
