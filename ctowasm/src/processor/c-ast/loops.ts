import { CNodePBase, ExpressionP, StatementP } from "~src/processor/c-ast/core";

export type IterationStatementP = DoWhileLoopP | WhileLoopP | ForLoopP

/**
 * Contain definition for AST node relating to loops in C.
 */
interface IterationStatementBase extends CNodePBase{
  type: "DoWhileLoop" | "WhileLoop" | "ForLoop";
  condition: ExpressionP;
  body: StatementP[];
}

export interface DoWhileLoopP extends IterationStatementBase {
  type: "DoWhileLoop";
}

export interface WhileLoopP extends IterationStatementBase {
  type: "WhileLoop";
}

export interface ForLoopP extends IterationStatementBase {
  type: "ForLoop";
  initialization: StatementP;
  update: StatementP;
}