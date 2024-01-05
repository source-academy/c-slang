import { CNodePBase, ExpressionP, StatementP } from "~src/processor/c-ast/core";

export interface SelectStatementP extends CNodePBase{
  type: "SelectStatement";
  ifBlock: ConditionalBlockP;
  elseIfBlocks: ConditionalBlockP[];
  elseBody?: StatementP[] | null;
}

export interface ConditionalBlockP {
  condition: ExpressionP;
  body: StatementP[];
}
