import { ArrayDeclaration, ArrayInitialization } from "~src/c-ast/arrays";
import { FunctionDeclaration, FunctionDefinition } from "~src/c-ast/functions";
import { Initialization, VariableDeclaration } from "~src/c-ast/variable";
import { VariableType } from "~src/common/types";

export interface CSymbolBase {
  type: "function" | "variable" | "array";
  isDefined: boolean; // stores whether the given symbol has been defined before.\
}

// The nodes that create a new symbol in their scopes.
export type CSymbolCreatorNodes =
  | FunctionDeclaration
  | FunctionDefinition
  | VariableDeclaration
  | Initialization
  | ArrayDeclaration
  | ArrayInitialization;

export interface FunctionSymbol extends CSymbolBase {
  type: "function";
  params: VariableType[];
  returnType: VariableType | null;
}

export interface VariableSymbol extends CSymbolBase {
  type: "variable";
  variableType: VariableType;
}

export interface ArraySymbol extends CSymbolBase {
  type: "array";
  variableType: VariableType;
  arraySize: number;
}

export type CSymbol = FunctionSymbol | VariableSymbol | ArraySymbol;

// Contains all variables and functions declared in a lexical scope
export interface Scope {
  parentScope: Scope | undefined | null; // the parent scope that this scope is in
  symbols: Record<string, CSymbol>; // mapping from name of function to object that contains information on the function
}
