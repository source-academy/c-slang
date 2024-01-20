/**
 * Definitions of core C AST nodes.
 */

import UnaryExpression, {
  FunctionCall,
  PostfixExpression,
  PrefixExpression,
} from "~src/parser/c-ast/expression/unaryExpression";
import { Assignment } from "~src/parser/c-ast/expression/assignment";
import JumpStatement from "./statement/jumpStatement";
import { SelectionStatement } from "~src/parser/c-ast/statement/selectionStatement";
import { Position } from "~src/parser/c-ast/misc";
import { Declaration } from "./declaration";
import { BinaryExpression } from "~src/parser/c-ast/expression/binaryExpression";
import Constant from "~src/parser/c-ast/expression/constant";
import {
  AddressOfExpression,
  PointerDereference,
} from "./expression/unaryExpression";
import IterationStatement from "~src/parser/c-ast/statement/iterationStatement";
import FunctionDefinition from "~src/parser/c-ast/functionDefinition";
import Block from "~src/parser/c-ast/statement/compoundStatement";
import IdentifierExpression from "~src/parser/c-ast/expression/identifierExpr";
import { DataType } from "~src/parser/c-ast/dataTypes";

export interface CNodeBase {
  type: string;
  position: Position;
}

export type CNode = Statement | FunctionDefinition;

// Root represents the starting node of the AST
export interface CAstRoot extends CNodeBase {
  type: "Root";
  children: (Declaration | FunctionDefinition)[];
}

/**
 * Statements that can be present in blocks
 */
export type Statement =
  | Block
  | Expression
  | IterationStatement
  | JumpStatement
  | SelectionStatement;

export type BlockItem = Statement | Declaration;

export type Expression =
  | Assignment
  | BinaryExpression
  | Constant
  | IdentifierExpression
  | UnaryExpression