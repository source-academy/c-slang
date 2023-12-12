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

// Contains information of a declared variable. To be stored in the scope of a ScopedParent.
export interface Variable {
  type: VariableType;
  name: string;
}

export interface ArrayVariable {
  type: VariableType;
  name: string;
  size: number;
}
