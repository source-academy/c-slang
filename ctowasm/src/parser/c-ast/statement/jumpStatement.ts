import { CNodeBase, Expression } from "~src/parser/c-ast/core";

type JumpStatement = BreakStatement | ContinueStatement | ReturnStatement;
export default JumpStatement;

export interface BreakStatement extends CNodeBase {
  type: "BreakStatement";
}

export interface ContinueStatement extends CNodeBase {
  type: "ContinueStatement";
}

export interface ReturnStatement extends CNodeBase {
  type: "ReturnStatement";
  value?: Expression;
}
