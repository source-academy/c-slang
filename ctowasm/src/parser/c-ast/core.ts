/**
 * Definitions of core C AST nodes.
 */

import {
  PostfixArithmeticExpression,
  PrefixArithmeticExpression,
  PrefixExpression,
} from "~src/parser/c-ast/unaryExpression";
import { Assignment, AssignmentExpression } from "~src/parser/c-ast/assignment";
import {
  FunctionDefinition,
  ReturnStatement,
  FunctionDeclaration,
  FunctionCallStatement,
  FunctionCall,
} from "~src/parser/c-ast/function";
import { IterationStatement } from "~src/parser/c-ast/loops";
import { SelectStatement } from "~src/parser/c-ast/select";
import { Position } from "~src/parser/c-ast/types";
import {
  ArrayElementExpr,
  Initialization,
  VariableDeclaration,
  VariableExpr,
} from "~src/parser/c-ast/variable";
import { BinaryExpression } from "~src/parser/c-ast/binaryExpression";
import { IntegerConstant, FloatConstant } from "~src/parser/c-ast/constants";

export interface CNodeBase {
  type: string;
  position: Position;
}

export type Declaration = FunctionDeclaration | VariableDeclaration;

export type CNode = BlockStatement | FunctionDefinition;

/**
 * Statements that can be present anywhere
 */
export type Statement =
  | Assignment
  | Declaration
  | FunctionCallStatement
  | Initialization;

/**
 * Statements that can be present in blocks
 */
export type BlockStatement =
  | Block
  | Expression
  | IterationStatement
  | ReturnStatement
  | SelectStatement
  | Statement;

export type Expression =
  | ArrayElementExpr
  | AssignmentExpression
  | BinaryExpression
  | IntegerConstant
  | FloatConstant
  | FunctionCall
  | PrefixArithmeticExpression
  | PostfixArithmeticExpression
  | VariableExpr
  | PrefixExpression;

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
  "PrefixArithmeticExpression",
  "PostfixArithmeticExpression",
  "VariableExpr",
  "UnaryExpression",
]);

export function isExpression(node: CNode) {
  return "type" in node && expressionNodeTypes.has(node.type);
}

export interface Block extends CNodeBase {
  type: "Block";
  children: BlockStatement[];
}

// Root represents the starting node of the AST
export interface CAstRoot extends CNodeBase {
  type: "Root";
  children: (Statement | FunctionDefinition)[];
}
