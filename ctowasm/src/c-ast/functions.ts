/**
 * Contains the defintions for all function related nodes.
 */
import { ScopedNode, Block, Expression } from "~src/c-ast/root";
import { VariableDeclaration } from "~src/c-ast/variable";
import { VariableType } from "~src/common/types";

// Information on a function - return type, name and parameters
interface FunctionInformation {
  returnType: VariableType | "void";
  name: string;
  parameters: VariableDeclaration[];
  sizeOfParameters: number; // size of all the parameters in bytes
}

export interface FunctionDeclaration extends FunctionInformation, ScopedNode {
  type: "FunctionDeclaration";
}

export interface FunctionDefinition extends FunctionInformation, ScopedNode {
  type: "FunctionDefinition";
  body: Block;
  sizeOfLocals: number; // size of all the locals in bytes
  sizeOfReturn: number; /// size of the return type
}

export interface FunctionCall extends Expression {
  type: "FunctionCall";
  name: string;
  args: Expression[];
}

/**
 * This node is to differentiate from a function call used as an expression.
 */
export interface FunctionCallStatement extends ScopedNode {
  type: "FunctionCallStatement";
  name: string;
  args: Expression[];
}

export interface ReturnStatement extends ScopedNode {
  type: "ReturnStatement";
  value?: Expression;
}
