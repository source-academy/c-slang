import { Block, Expression, ScopedNode, Statement } from "~src/c-ast/root";

/**
 * Contain definition for AST node relating to loops in C.
 */
export interface IterationStatement extends ScopedNode {
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
