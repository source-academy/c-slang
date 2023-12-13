import { Block, Expression, CNode, Statement } from "~src/c-ast/core";

/**
 * Contain definition for AST node relating to loops in C.
 */
export interface IterationStatement extends CNode {
  type: "DoWhileLoop" | "WhileLoop" | "ForLoop";
  condition: Expression;
  body: Block;
}

export interface DoWhileLoop extends IterationStatement {
  type: "DoWhileLoop";
}

export interface WhileLoop extends IterationStatement {
  type: "WhileLoop";
}

export interface ForLoop extends IterationStatement {
  type: "ForLoop";
  initialization: Statement;
  update: Expression;
}
