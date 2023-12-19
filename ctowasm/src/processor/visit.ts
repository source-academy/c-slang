/**
 * Definition of visitor function.
 */

import { ArrayDeclaration, ArrayInitialization } from "~src/c-ast/arrays";
import { BinaryExpression } from "~src/c-ast/binaryExpression";
import { Constant } from "~src/c-ast/constants";
import { FunctionDefinition } from "~src/c-ast/functions";
import { SymbolTable } from "~src/c-ast/types";
import { VariableDeclaration, Initialization } from "~src/c-ast/variable";
import { getVariableSize } from "~src/common/utils";
import { ProcessingError } from "~src/errors";
import { evaluateConstantBinaryExpression, setVariableTypeOfConstant, setVariableTypeOfBinaryExpression, setVariableTypeOfSymbolAccessExpression } from "~src/processor/expressionUtil";
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
  enclosingFunc?: FunctionDefinition
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
  if (node.type === "FunctionDefinition" || node.type === "ForLoop" || node.type === "Block") {
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
  } else if (node.type === "ArrayDeclaration") {
    const n = node as ArrayDeclaration;
    if (enclosingFunc) {
      enclosingFunc.sizeOfLocals +=
        getVariableSize(n.variableType) * n.numElements;
    }
    symbolTable.addEntry(n);
  } else if (node.type === "Initialization") {
    const n = node as Initialization;
    symbolTable.addEntry(n);
    if (enclosingFunc) {
      enclosingFunc.sizeOfLocals += getVariableSize(n.variableType);
    } else {
      // this intialization is global. Needs to be a constant expression, which we can evaluate now
      if (n.value.type === "BinaryExpression" || n.value.type === "Constant") {
        n.value = evaluateConstantBinaryExpression(
          n.value as BinaryExpression | Constant
        );
      }
    }
  } else if (node.type === "ArrayInitialization") {
    const n = node as ArrayInitialization;
    symbolTable.addEntry(n);
    if (enclosingFunc) {
      enclosingFunc.sizeOfLocals +=
        getVariableSize(n.variableType) * n.numElements;
      n.elements.forEach((e) =>
        visit(sourceCode, e, symbolTable, enclosingFunc)
      );
    } else {
      // this intialization is global. Needs to be a constant expression (assumed), which we can evaluate now
      const evaluatedElements = [];
      for (const element of n.elements) {
        evaluatedElements.push(
          evaluateConstantBinaryExpression(
            element as BinaryExpression | Constant
          )
        );
      }
      n.elements = evaluatedElements;
    }
  } else if (node.isExpr) {
    // all expressions must be processed to fill in their symbol type
    if (node.type === "Constant") {
      setVariableTypeOfConstant(node as Constant);
    } else if (node.type === "BinaryExpression") {
      setVariableTypeOfBinaryExpression(node as BinaryExpression);
    } else if (
      node.type === "FunctionCall" ||
      node.type === "VariableExpr" ||
      node.type === "ArrayElementExpr"
    ) {
      setVariableTypeOfSymbolAccessExpression(node, symbolTable);
    } else {
      // safeguard against not handling an expression (all expressions must have their variableType filled)
      throw new ProcessingError(
        "Processing Error: Unhandled expression node",
        sourceCode,
        node.position
      );
    }
  }
  // visit each child of this node
  for (const k of Object.keys(node)) {
    visit(sourceCode, node[k], symbolTable, enclosingFunc);
  }
}
