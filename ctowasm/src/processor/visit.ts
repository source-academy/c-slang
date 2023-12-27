/**
 * Definition of visitor function.
 */

import {
  ArrayDeclaration,
  ArrayElementExpr,
  ArrayInitialization,
} from "~src/c-ast/arrays";
import { AssignmentExpression } from "~src/c-ast/assignment";
import { BinaryExpression } from "~src/c-ast/binaryExpression";
import { Constant, IntegerConstant } from "~src/c-ast/constants";
import { Expression, isExpression } from "~src/c-ast/core";
import { FunctionCall, FunctionDefinition } from "~src/c-ast/functions";
import { SymbolTable } from "~src/c-ast/symbolTable";
import {
  PostfixArithmeticExpression,
  PrefixArithmeticExpression,
  UnaryExpression,
} from "~src/c-ast/unaryExpression";
import { VariableDeclaration, Initialization } from "~src/c-ast/variable";
import { getVariableSize, isConstant } from "~src/common/utils";
import { ProcessingError, toJson } from "~src/errors";
import {
  evaluateConstantBinaryExpression,
  processConstant,
  setVariableTypeOfBinaryExpression,
  setVariableTypeOfSymbolAccessExpression,
} from "~src/processor/expressionUtil";
import { handleScopeCreatingNodes } from "~src/processor/util";

/**
 * Visitor function for traversing the C AST to process C AST.
 * Will call visit on all the fields of the current node being traversed.
 * @param ast
 * @param sourceCode
 */
export function visit(
  sourceCode: string,
  node: any,
  symbolTable: SymbolTable,
  enclosingFunc?: FunctionDefinition,
) {
  if (
    !(
      Array.isArray(node) ||
      (typeof node === "object" && node !== null && "type" in node)
    )
  ) {
    // ignore objects that are not AST nodes OR not an array of nodes
    return;
  }
  // Handle nodes that create new symboltables
  if (
    node.type === "FunctionDefinition" ||
    node.type === "ForLoop" ||
    node.type === "Block"
  ) {
    handleScopeCreatingNodes(sourceCode, node, symbolTable, enclosingFunc);
    return;
  }

  // Handle other nodes that may require specific actions
  if (node.type === "VariableDeclaration") {
    const n = node as VariableDeclaration;
    if (enclosingFunc) {
      enclosingFunc.sizeOfLocals += getVariableSize(n.variableType);
    }
    symbolTable.addEntry(n);
    return;
  } else if (node.type === "ArrayDeclaration") {
    const n = node as ArrayDeclaration;
    if (enclosingFunc) {
      enclosingFunc.sizeOfLocals +=
        getVariableSize(n.variableType) * n.numElements;
    }
    symbolTable.addEntry(n);
    return;
  } else if (node.type === "Initialization") {
    const n = node as Initialization;
    symbolTable.addEntry(n);
    if (enclosingFunc) {
      enclosingFunc.sizeOfLocals += getVariableSize(n.variableType);
      visit(sourceCode, n.value, symbolTable, enclosingFunc);
    } else {
      // this intialization is global. Needs to be a constant expression, which we can evaluate now
      if (n.value.type === "BinaryExpression" || isConstant(n.value)) {
        n.value = evaluateConstantBinaryExpression(
          n.value as BinaryExpression | Constant,
        );
      }
    }
    return;
  } else if (node.type === "ArrayInitialization") {
    const n = node as ArrayInitialization;
    symbolTable.addEntry(n);
    if (enclosingFunc) {
      enclosingFunc.sizeOfLocals +=
        getVariableSize(n.variableType) * n.numElements;
      n.elements.forEach((e) =>
        visit(sourceCode, e, symbolTable, enclosingFunc),
      );
    } else {
      // this intialization is global. Needs to be a constant expression (assumed), which we can evaluate now
      const evaluatedElements = [];
      for (const element of n.elements) {
        evaluatedElements.push(
          evaluateConstantBinaryExpression(
            element as BinaryExpression | IntegerConstant,
          ),
        );
      }
      n.elements = evaluatedElements;
    }
    return;
  } else if (isConstant(node)) {
    processConstant(node as Constant);
    return;
  } else if (node.type === "BinaryExpression") {
    const n = node as BinaryExpression;
    visit(sourceCode, n.leftExpr, symbolTable, enclosingFunc);
    visit(sourceCode, n.rightExpr, symbolTable, enclosingFunc);
    setVariableTypeOfBinaryExpression(node as BinaryExpression);
    return;
  } else if (node.type === "FunctionCall") {
    const n = node as FunctionCall;
    setVariableTypeOfSymbolAccessExpression(node, symbolTable);
    n.args.forEach((arg) => visit(sourceCode, arg, symbolTable, enclosingFunc));
    return;
  } else if (node.type === "VariableExpr") {
    setVariableTypeOfSymbolAccessExpression(node, symbolTable);
    return;
  } else if (node.type === "ArrayElementExpr") {
    const n = node as ArrayElementExpr;
    visit(sourceCode, n.index, symbolTable, enclosingFunc);
    setVariableTypeOfSymbolAccessExpression(node, symbolTable);
    n.variableType = n.index.variableType;
    return;
  } else if (
    node.type === "PrefixArithmeticExpression" ||
    node.type === "PostfixArithmeticExpression"
  ) {
    const n = node as PrefixArithmeticExpression | PostfixArithmeticExpression;
    visit(sourceCode, n.variable, symbolTable, enclosingFunc);
    n.variableType = n.variable.variableType;
    return;
  } else if (node.type === "AssignmentExpression") {
    const n = node as AssignmentExpression;
    visit(sourceCode, n.variable, symbolTable, enclosingFunc);
    visit(sourceCode, n.value, symbolTable, enclosingFunc);
    n.variableType = n.variable.variableType;
    return;
  } else if (node.type === "UnaryExpression") {
    const n = node as UnaryExpression;
    visit(sourceCode, n.expression, symbolTable, enclosingFunc);
    n.variableType = n.expression.variableType;
  } else if (isExpression(node)) {
    const n = node as Expression;
    // sanity check - make sure no expressions are missed as each need their variableType field set.
    throw new ProcessingError(
      `Unhandled expression: ${toJson(n)}`,
      sourceCode,
      n.position,
    );
  }

  // for other nodes, just traverse all their fields
  for (const k of Object.keys(node)) {
    visit(sourceCode, node[k], symbolTable, enclosingFunc);
  }
}
