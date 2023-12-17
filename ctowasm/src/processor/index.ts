/**
 * C AST Processor Module.
 */

import { getVariableSize } from "~src/common/utils";
import { ProcessingError } from "../errors";
import { Block, CAstRoot } from "~src/c-ast/core";
import { ArrayDeclaration, ArrayInitialization } from "~src/c-ast/arrays";

import { FunctionCall, FunctionDefinition } from "~src/c-ast/functions";
import { Initialization, VariableDeclaration } from "~src/c-ast/variable";

import {
  evaluateConstantBinaryExpression,
  setVariableTypeOfConstant,
  setVariableTypeOfBinaryExpression,
  setVariableTypeOfSymbolAccessExpression,
} from "~src/processor/expressionUtil";
import { Constant } from "~src/c-ast/constants";
import { BinaryExpression } from "~src/c-ast/binaryExpression";
import { SymbolTable } from "~src/c-ast/types";
import { visit } from "~src/processor/visit";

/**
 * Processes the C AST tree generated by parsing, to add additional needed information for certain nodes.
 * @param ast
 * @param sourceCode
 * @returns
 */
export default function process(sourceCode: string, ast: CAstRoot) {
  ast.symbolTable = new SymbolTable();
  visit(sourceCode, ast, ast.symbolTable);
  return ast;
}

