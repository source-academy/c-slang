/**
 * Definitions of core C AST nodes.
 */

import {
  PostfixExpression,
  PrefixExpression,
} from "~src/c-ast/unaryExpression";
import { ArrayDeclaration, ArrayInitialization } from "~src/c-ast/arrays";
import { Assignment, CompoundAssignment } from "~src/c-ast/assignment";
import {
  FunctionDefinition,
  ReturnStatement,
  FunctionDeclaration,
  FunctionCallStatement,
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
  isExpr: true; // handy field to easily tell if a node is an expression. Set by parser. This makes it easy to distinguish and filter out expressions during translation. TODO: see if better way to achieve this
}

export type Declaration = VariableDeclaration | FunctionDeclaration;

export type Statement =
  | Declaration
  | Initialization
  | ArrayDeclaration
  | ArrayInitialization
  | Assignment
  | FunctionCallStatement
  | PrefixExpression
  | PostfixExpression
  | CompoundAssignment;

// Root represents the starting node of the AST
export interface CAstRoot extends CNode {
  type: "Root";
  children: (Statement | FunctionDefinition)[];
}

export type BlockItem =
  | Statement
  | Block
  | ReturnStatement
  | SelectStatement
  | IterationStatement;

export interface Block extends CNode {
  type: "Block";
  children: BlockItem[];
}
