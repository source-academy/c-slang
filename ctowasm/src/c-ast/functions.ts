/**
 * Contains the defintions for all function related nodes.
 */
import { CNode, Block, Expression } from "~src/c-ast/core";
import { VariableDeclaration } from "~src/c-ast/variable";
import { PrimaryCDataType } from "~src/common/types";

// Information on a function - return type, name and parameters
interface FunctionInformation {
  returnType: PrimaryCDataType | null;
  name: string;
  parameters: VariableDeclaration[];
  sizeOfParameters: number; // size of all the parameters in bytes
}

export interface FunctionDeclaration extends FunctionInformation, CNode {
  type: "FunctionDeclaration";
}

export interface FunctionDefinition extends FunctionInformation, CNode {
  type: "FunctionDefinition";
  body: Block;
  sizeOfLocals: number; // size of all the locals in bytes
  sizeOfReturn: number; /// size of the return type
}

export interface FunctionCall extends Expression {
  type: "FunctionCall";
  name: string;
  args: Expression[];
  symbolTableId: number; // id of entry in symbol table - to be filled during processing
}

/**
 * This node is to differentiate from a function call used as an expression.
 */
export interface FunctionCallStatement extends CNode {
  type: "FunctionCallStatement";
  name: string;
  args: Expression[];
  symbolTableId: number; // id of entry in symbol table - to be filled during processing
}

export interface ReturnStatement extends CNode {
  type: "ReturnStatement";
  value?: Expression;
}
