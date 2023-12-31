/**
 * Definitions of core C AST nodes.
 */

import {
  PostfixExpression,
  PrefixExpression,
} from "~src/c-ast/unaryExpression";
import { ArrayDeclaration, ArrayInitialization } from "~src/c-ast/arrays";
import { Assignment } from "~src/c-ast/assignment";
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
import { SymbolTable } from "~src/c-ast/symbolTable";

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

/**
 * A collection of type names of expression nodes.
 * Useful for traversal of AST to easily determine if a node is an expression.
 */
const expressionNodeTypes = new Set([
  "ArrayElementExpr",
  "AssignmentExpression",
  "BinaryExpression",
  "IntegerConstant",
  "FloatConstant",
  "FunctionCall",
  "PrefixExpression",
  "PostfixExpression",
  "VariableExpr",
]);

export function isExpression(node: CNode) {
  return "type" in node && expressionNodeTypes.has(node.type);
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
  | PostfixExpression;

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

// Root represents the starting node of the AST
export interface CAstRoot extends CNode {
  type: "Root";
  children: (Statement | FunctionDefinition)[];
  symbolTable: SymbolTable;
}
