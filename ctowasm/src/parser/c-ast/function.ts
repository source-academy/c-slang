/**
 * Contains the defintions for all function related nodes.
 */
import { CNodeBase, Block, Expression } from "~src/parser/c-ast/core";
import { VariableDeclaration } from "~src/parser/c-ast/variable";
import { DataType } from "~src/common/types";
import { UnaryExpressionBase } from "./unaryExpression";

// Information on a function - return type, name and parameters
interface FunctionInformation {
  returnType: DataType | null;
  name: string;
  parameters: VariableDeclaration[];
}

export interface FunctionDeclaration extends FunctionInformation, CNodeBase {
  type: "FunctionDeclaration";
  // TODO: parameters for func declaration dont need names, hence variable decalration is incorrect, CHANGE THIS
}

export interface FunctionDefinition extends FunctionInformation, CNodeBase {
  type: "FunctionDefinition";
  body: Block;
}

export interface FunctionCall extends UnaryExpressionBase {
  type: "FunctionCall";
  args: Expression[];
}

/**
 * This node is to differentiate from a function call used as an expression.
 */
export interface FunctionCallStatement extends UnaryExpressionBase {
  type: "FunctionCallStatement";
  args: Expression[];
}

export interface ReturnStatement extends CNodeBase {
  type: "ReturnStatement";
  value?: Expression;
}
