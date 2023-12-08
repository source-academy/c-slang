/**
 * Various types that are not AST nodes, but used as fields in AST nodes.
 */

import { VariableType } from "~src/common/types";

/**
 * This file contains the typescript interfaces for each astNode.
 */
interface Point {
  line: number;
  offset: number;
  column: number;
}

export interface Position {
  start: Point;
  end: Point;
}

// Contains the information of a declared function. To be stored in the scope of a ScopedParent.
export interface FunctionDetails {
  returnType: VariableType | "void";
  name: string;
  parameters: Variable[];
}

// Contains all variables and functions declared in a lexical scope
export interface Scope {
  parentScope: Scope | undefined | null; // the parent scope that this scope is in
  functions: Record<string, FunctionDetails>; // mapping from name of function to object that contains information on the function
  variables: Record<string, Variable>; // mapping from name of variable to object that contains information on the variable
  arrays: Record<string, ArrayVariable>;
};

// Contains information of a declared variable. To be stored in the scope of a ScopedParent.
export interface Variable {
  type: VariableType;
  name: string;
  isParam?: boolean; // to distinguish function parameters from regular vars
}

export interface ArrayVariable {
  type: VariableType;
  name: string;
  size: number;
}
