/**
 * Definitions of core C AST nodes.
 */

import { ArrayDeclaration, ArrayInitialization } from "~src/c-ast/arrays";
import {
  FunctionDefinition,
  ReturnStatement,
  FunctionDeclaration,
} from "~src/c-ast/functions";
import { IterationStatement } from "~src/c-ast/loops";
import { SelectStatement } from "~src/c-ast/select";
import { Position } from "~src/c-ast/types";
import { Initialization, VariableDeclaration } from "~src/c-ast/variable";
import { VariableType } from "~src/common/types";

export interface CNode {
  type: string;
  position: Position;
}

/**
 * Node definition for expressions to inherit from.
 */
export interface Expression extends CNode {
  variableType: VariableType; // the type of the expression. to be filled before or after processing, depending on the expression type //TODO: not actually set in processor yet
}

export type Declaration = VariableDeclaration | FunctionDeclaration;

export type Statement =
  | Declaration
  | Initialization
  | ArrayDeclaration
  | ArrayInitialization;

// Root represents the starting node of the AST
export interface CAstRoot extends CNode {
  type: "Root";
  children: (Statement | FunctionDefinition)[];
}

type BlockItem =
  | Statement
  | Block
  | ReturnStatement
  | SelectStatement
  | IterationStatement;

export interface Block extends CNode {
  type: "Block";
  children: BlockItem[];
}
