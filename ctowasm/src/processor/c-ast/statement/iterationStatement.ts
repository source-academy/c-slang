import { CNodePBase, ExpressionP, StatementP } from "~src/processor/c-ast/core";

export type IterationStatementP = DoWhileLoopP | WhileLoopP | ForLoopP;

/**
 * Contain definition for AST node relating to loops in C.
 */
interface IterationStatementBase extends CNodePBase {
  type: "DoWhileLoop" | "WhileLoop" | "ForLoop";
  condition: ExpressionP | null;
  body: StatementP[];
}

export interface DoWhileLoopP extends IterationStatementBase {
  type: "DoWhileLoop";
  condition: ExpressionP 
}

export interface WhileLoopP extends IterationStatementBase {
  type: "WhileLoop";
  condition: ExpressionP 
}

export interface ForLoopP extends IterationStatementBase {
  type: "ForLoop";
  // statements that run before the condition and body
  clause: StatementP[];
  update: StatementP[];
  condition: ExpressionP | null;
}
