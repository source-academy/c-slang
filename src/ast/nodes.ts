/**
 * This file contains the typescript interfaces for each astNode.
 */

// Root represents the starting node of the AST
export class Root {
  name = "Root";
  children: (Statement | Function)[];
  constructor(children: (Statement | Function)[]) {
    this.children = children;
  }
}

export class Block {
  children: (Statement | Block)[];
  constructor(children: (Statement | Block)[]) {
    this.children = children;
  }
}

export type Type = "int";

// Contains the variable name, used for addressing the symbol table
export type Variable = string;

export type Value = string | Number;

// to be expanded later to include proper expressions
export type Expression = Value;

export type Statement = Declaration | Initialization;

export class Initialization {
  type: Type;
  variable: Variable;
  value: Expression;
  constructor(type: Type, variable: Variable, value: Value) {
    this.type = type;
    this.variable = variable;
    this.value = value;
  }
}

export class Declaration {
  type: Type;
  variable: Variable;
  constructor(type: Type, variable: Variable) {
    this.type = type;
    this.variable = variable;
  }
}

export class Function {
  returnType: Type;
  name: string;
  parameters: Declaration[];
  body: Block;

  constructor(
    returnType: Type,
    name: string,
    parameters: Declaration[],
    body: Block
  ) {
    this.returnType = returnType;
    this.name = name;
    this.parameters = parameters;
    this.body = body;
  }
}
