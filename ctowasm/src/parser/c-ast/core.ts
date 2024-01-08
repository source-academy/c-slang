/**
 * Definitions of core C AST nodes.
 */

import {
  PostfixArithmeticExpression,
  PrefixArithmeticExpression,
  PrefixExpression,
} from "~src/parser/c-ast/unaryExpression";
import { Assignment } from "~src/parser/c-ast/assignment";
import { FunctionDefinition, FunctionCall } from "~src/parser/c-ast/function";
import { ReturnStatement } from "./jumpStatement";
import { IterationStatement } from "~src/parser/c-ast/iterationStatement";
import { SelectionStatement } from "~src/parser/c-ast/selectionStatement";
import { Position } from "~src/parser/c-ast/types";
import {
  ArrayElementExpr,
  Declaration,
  VariableExpr,
} from "~src/parser/c-ast/variable";
import { BinaryExpression } from "~src/parser/c-ast/binaryExpression";
import { IntegerConstant, FloatConstant } from "~src/parser/c-ast/constants";
import {
  AddressOfExpression,
  PointerDereference,
} from "~src/parser/c-ast/pointers";

export interface CNodeBase {
  type: string;
  position: Position;
}

export type CNode = Statement | FunctionDefinition;

/**
 * Statements that can be present outside a block
 */
export type ExternalDeclaration = Declaration | FunctionDefinition;

/**
 * Statements that can be present in blocks
 */
export type Statement =
  | Block
  | Expression
  | IterationStatement
  | ReturnStatement
  | SelectionStatement;

export type BlockItem = Statement | Declaration;

export type Expression =
  | ArrayElementExpr
  | Assignment
  | BinaryExpression
  | IntegerConstant
  | FloatConstant
  | FunctionCall
  | PrefixArithmeticExpression
  | PostfixArithmeticExpression
  | VariableExpr
  | PrefixExpression
  | PointerDereference
  | AddressOfExpression;

/**
 * A collection of type names of expression nodes.
 * Useful for traversal of AST to easily determine if a node is an expression.
 */
const expressionNodeTypes = new Set([
  "ArrayElementExpr",
  "Assignment",
  "BinaryExpression",
  "IntegerConstant",
  "FloatConstant",
  "FunctionCall",
  "PrefixArithmeticExpression",
  "PostfixArithmeticExpression",
  "VariableExpr",
  "PrefixExpression",
  "PointerDereference",
  "AddressOfExpression",
]);

export function isExpression(node: CNode) {
  return "type" in node && expressionNodeTypes.has(node.type);
}

export interface Block extends CNodeBase {
  type: "Block";
  children: Statement[];
}

// Root represents the starting node of the AST
export interface CAstRoot extends CNodeBase {
  type: "Root";
  children: (ExternalDeclaration | FunctionDefinition)[];
}
