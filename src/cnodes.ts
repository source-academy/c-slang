/**
 * This file contains the typescript interfaces for each astNode.
 */

import { Node, Parent, Literal } from "unist";

// Modified versions of Node and Parent respectively to contain scope infr
export interface ScopedNode extends Node { scope: Scope };
export interface ScopedParent extends ScopedNode , Parent { 
  parentScope: Scope;
  scope: Scope;
}; 

// Contains all variables and functions declared in a lexical scope
export type Scope = {
  functions: Record<string, Function>; // mapping from name of function to object that contains information on the function
  variables: Record<string, Variable>; // mapping from name of variable to object that contains information on the variable
}

// Contains the information of a declared function. To be stored in the scope of a ScopedParent.
export interface Function {
  returnType: VariableType;
  name: string;
  parameters: Variable[];

}

// Contains information of a declared variable. To be stored in the scope of a ScopedParent.
export interface Variable {
  type: VariableType;
  name: string;
}

// Root represents the starting node of the AST
export interface Root extends ScopedParent {
  type: "Root";
  children: (Statement | FunctionDefinition)[];
}

type BlockItem = Statement | Block;

export interface Block extends ScopedParent {
  type: "Block";
  children: BlockItem[];
}

export type VariableType = "int";

// to be expanded later to include proper expressions
export type Expression = Literal | FunctionCall;

export type Statement = Declaration | Initialization;

export interface Initialization extends ScopedNode{
  type: "Initialization",
  data: {
    variableType: VariableType;
    name: string;
    value: Expression;
  }
}

export type Declaration = VariableDeclaration | FunctionDeclaration;

export interface VariableDeclaration extends ScopedNode {
  type: "VariableDeclaration";
  data: {
    variableType: VariableType;
    name: string;
  }
}

// A variable assignment
export interface Assignment extends ScopedNode {
  type: "Assignment",
  data: {
    name: string;
    value: Expression;
  }
}

// Information on a function - return type, name and parameters
interface FunctionInformation {
  returnType: VariableType;
  name: string;
  parameters: VariableDeclaration[];
}

export interface FunctionDeclaration extends ScopedNode {
  type: "FunctionDeclaration";
  data: FunctionInformation 
}


export interface FunctionDefinition extends ScopedParent {
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
