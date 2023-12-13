/**
 * Semantic Analyser pipeline module that performs basic semantic checks.
 */

import { ArrayDeclaration, ArrayInitialization } from "~src/c-ast/arrays";
import { FunctionDeclaration, FunctionDefinition } from "~src/c-ast/functions";
import { Block, CAstRoot, CNode } from "~src/c-ast/core";
import { Initialization, VariableDeclaration } from "~src/c-ast/variable";
import {
  checkForArrayDeclaration,
  checkForFunctionDeclaration,
  checkForFunctionParameterRedeclaration,
  checkForRedeclaration,
  checkForRedefinition,
  checkForVariableDeclaration,
} from "~src/semanticAnalyser/checks";
import { CSymbolCreatorNodes, Scope } from "~src/semanticAnalyser/types";

/**
 * Main exported function which traverses the C AST and checks for semantic errors.
 *
 */
export function checkForErrors(
  sourceCode: string,
  ast: CAstRoot,
  specialFunctions: string[] = []
) {
  const specialFunctionsSet = new Set(specialFunctions);
  /**
   * Visit function for traversing and analysing the AST.
   */
  function visit(node: any, currentScope: Scope, pre?: CNode) {
    if (
      !(
        Array.isArray(node) ||
        (typeof node === "object" && node !== null && "type" in node)
      )
    ) {
      // ignore objects that are not AST nodes
      return;
    }
    if (node.type === "Block") {
      // create a new scope
      const n = node as Block;
      let scope;
      if (pre?.type !== "FunctionDefinition") {
        // only create new scope if not a block following a function since function will have been created already
        scope = createNewScope(currentScope);
      } else {
        scope = currentScope;
      }
      for (const child of n.children) {
        visit(child, scope);
      }
    } else if (node.type === "FunctionDefinition") {
      const n = node as FunctionDefinition;
      checkForRedeclaration(sourceCode, n, currentScope);
      checkForRedefinition(sourceCode, n, currentScope);
      checkForFunctionParameterRedeclaration(sourceCode, n);
      createSymbolEntry(n, currentScope, true);
      const scope = createNewScope(currentScope);
      // add all params to function symbol table by visiting them
      n.parameters.forEach((p) => visit(p, scope));
      // traverse function body nodes
      visit(n.body, scope, n);
    } else if (node.type === "FunctionDeclaration") {
      const n = node as FunctionDeclaration;
      checkForRedeclaration(sourceCode, n, currentScope);
      checkForFunctionParameterRedeclaration(sourceCode, n);
      createSymbolEntry(n, currentScope);
    } else if (node.type === "Initialization") {
      const n = node as Initialization;
      checkForRedeclaration(sourceCode, n, currentScope);
      checkForRedefinition(sourceCode, n, currentScope);
      createSymbolEntry(n, currentScope, true);
      visit(n.value, currentScope);
    } else if (node.type === "VariableDeclaration") {
      const n = node as VariableDeclaration;
      checkForRedeclaration(sourceCode, n, currentScope);
      createSymbolEntry(n, currentScope, true);
    } else if (node.type === "ArrayInitialization") {
      const n = node as ArrayInitialization;
      checkForRedeclaration(sourceCode, n, currentScope);
      checkForRedefinition(sourceCode, n, currentScope);
      createSymbolEntry(n, currentScope, true);
      // visit each expression of the array initializer
      n.elements.forEach((e) => visit(e, currentScope));
    } else if (node.type === "ArrayDeclaration") {
      const n = node as ArrayDeclaration;
      checkForRedeclaration(sourceCode, n, currentScope);
      createSymbolEntry(n, currentScope, true);
    } else if (node.type === "VariableExpr") {
      checkForVariableDeclaration(sourceCode, node, currentScope);
    } else if (node.type === "ArrayElementExpr") {
      checkForArrayDeclaration(sourceCode, node, currentScope);
    } else if (
      node.type === "FunctionCall" ||
      node.type === "FunctionCallStatement"
    ) {
      checkForFunctionDeclaration(
        sourceCode,
        node,
        currentScope,
        specialFunctionsSet
      );
    } else if (node.type === "ForLoop") {
      // new scope just for for loop initialization
      const newScope = createNewScope(currentScope);
      visit(node.initialization, newScope);
      visit(node.condition, newScope);
      visit(node.update, newScope);
      visit(node.body, newScope);
    } else {
      // for all other nodes, just visit all their children
      for (const child of Object.keys(node)) {
        visit(node[child], currentScope);
      }
    }
  }

  visit(ast, createNewScope(null));
}

/**
 * Create a new scope object.
 * @param parentScope parent scope that this scope exists within.
 * @returns new scope object.
 */
function createNewScope(parentScope: Scope | null): Scope {
  return {
    parentScope,
    symbols: {},
  };
}

/**
 * Creates symbol entry within the given scope.
 */
function createSymbolEntry(
  node: CSymbolCreatorNodes,
  scope: Scope,
  isDefined = false
) {
  if (
    node.type === "FunctionDeclaration" ||
    node.type === "FunctionDefinition"
  ) {
    scope.symbols[node.name] = {
      type: "function",
      returnType: node.returnType,
      params: node.parameters.map((p) => p.variableType),
      isDefined,
    };
  } else if (
    node.type === "VariableDeclaration" ||
    node.type === "Initialization"
  ) {
    scope.symbols[node.name] = {
      type: "variable",
      variableType: node.variableType,
      isDefined,
    };
  } else if (
    node.type === "ArrayDeclaration" ||
    node.type === "ArrayInitialization"
  ) {
    scope.symbols[node.name] = {
      type: "array",
      variableType: node.variableType,
      arraySize: node.size,
      isDefined,
    };
  } else {
    console.assert(false, "Unhandled symbol creator node");
  }
}
