import {
  Block,
  Expression,
  CNodeBase,
  Statement,
} from "~src/parser/c-ast/core";

export type IterationStatement = DoWhileLoop | WhileLoop | ForLoop;

/**
 * Contain definition for AST node relating to loops in C.
 */
interface IterationStatementBase extends CNodeBase {
  condition: Expression;
  body: Block;
}

export interface DoWhileLoop extends IterationStatementBase {
  type: "DoWhileLoop";
}

export interface WhileLoop extends IterationStatementBase {
  type: "WhileLoop";
}

export interface ForLoop extends IterationStatementBase {
  type: "ForLoop";
  initialization: Statement;
  update: Statement;
}
