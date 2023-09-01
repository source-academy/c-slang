/**
 * This file contains the typescript interfaces for each astNode.
 */

import { Node, Literal, Parent } from "unist";

// Root represents the starting node of the AST
export interface Root extends Parent {
  type: "Root";
  children: (Statement | FunctionDefinition )[];
}

type BlockItem = Statement | Block;

export interface Block extends Parent {
  type: "Block";
  children: BlockItem[];
}

export type VariableType = "int";

// to be expanded later to include proper expressions
export type Expression = Literal | FunctionCall;

export type Statement = Declaration | Initialization;

export interface Initialization extends Node{
  type: "Initialization",
  data: {
    variableType: VariableType;
    name: string;
    value: Expression;
  }
}

export type Declaration = VariableDeclaration | FunctionDeclaration;

export interface VariableDeclaration extends Node {
  type: "VariableDeclaration";
  data: {
    variableType: VariableType;
    name: string;
  }
}

// Information on a function - return type, name and parameters
interface FunctionInformation {
  returnType: VariableType;
  name: string;
  parameters: VariableDeclaration[];
}

export interface FunctionDeclaration extends Node {
  type: "FunctionDeclaration";
  data: FunctionInformation 
}


// children would be the 
export interface FunctionDefinition extends Parent {
  type: "FunctionDefinition";
  data: FunctionInformation & { body: Block };
}

//TODO: check if Literal better here than node
export interface FunctionCall extends Literal {
  type: "FunctionCall";
  data: {
    name: string;
    args: Expression[];
  }
  // value will be set later when calculated (TODO: Check if make sense)
}
