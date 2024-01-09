import { Expression, CNodeBase, Statement } from "~src/parser/c-ast/core";
import { Declaration } from "../declaration";

type IterationStatement = DoWhileLoop | WhileLoop | ForLoop;
export default IterationStatement;

/**
 * Contain definition for AST node relating to loops in C.
 */
interface IterationStatementBase extends CNodeBase {
  condition: Expression;
  body: Statement;
}

export interface DoWhileLoop extends IterationStatementBase {
  type: "DoWhileLoop";
}

export interface WhileLoop extends IterationStatementBase {
  type: "WhileLoop";
}

export interface ForLoop extends IterationStatementBase {
  type: "ForLoop";
  // clause of a for loop (to run before condition) can be delcaration, expression or null
  clause: {
    type: "Expression" | "Declaration";
    value: Declaration | Expression;
  } | null;
  update: Expression;
}
