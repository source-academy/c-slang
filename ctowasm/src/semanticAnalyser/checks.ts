/**
 * Definition of some functions to check for simple C program errors.
 */

import {
  FunctionDefinition,
  FunctionCall,
  FunctionCallStatement,
  FunctionDeclaration,
} from "~src/parser/c-ast/function";
import { Declaration } from "~src/parser/c-ast/core";
import { Initialization, VariableExpr } from "~src/parser/c-ast/variable";
import { SemanticAnalysisError } from "~src/errors";
import { SymbolTable } from "~src/processor/symbolTable";

/**
 * Checks for redeclaration of a variable with different signature, throw ProcessingError if redeclaration has occured.
 * @param sourceCode
 * @param name name of variable
 * @param node AST node that the variable is at
 */
export function checkForRedeclaration(
  sourceCode: string,
  node: Declaration | Initialization | FunctionDefinition | FunctionDeclaration,
  symbolTable: SymbolTable
) {
  if (node.name in symbolTable.symbols) {
    if (symbolTable.parentTable !== null) {
      // Cannot have redeclaration within a function
      throw new SemanticAnalysisError(
        `Redeclaration error: ${node.name} redeclared in same scope`,
        sourceCode,
        node.position
      );
    }

    if (
      (node.type === "FunctionDeclaration" ||
        node.type === "FunctionDefinition") &&
      symbolTable.getSymbolEntry(node.name).type !== "function"
    ) {
      // check for redeclaration
      throw new SemanticAnalysisError(
        `Redeclaration error: '${
          node.name
        }' redeclared as different kind of symbol: function instead of '${
          symbolTable.symbols[node.name].type
        }'`,
        sourceCode,
        node.position
      );
    } else if (
      (node.type === "Initialization" || node.type === "VariableDeclaration") &&
      symbolTable.getSymbolEntry(node.name).type !== "variable"
    ) {
      throw new SemanticAnalysisError(
        `Redeclaration error: '${
          node.name
        }' redeclared as different kind of symbol: variable instead of '${
          symbolTable.symbols[node.name].type
        }'`,
        sourceCode,
        node.position
      );
    }

    // check for conflicting variable declarations (same name, different type)
    if (
      (node.type === "VariableDeclaration" || node.type === "Initialization")) {
        const existing 
        if (node.dataType.type === "primary" && )
      }
    // check for conflicting function declarations (same name, different return type or parameters)
    if (
      (node.type === "FunctionDefinition" ||
        node.type === "FunctionDeclaration") &&
      (node.returnType !==
        (symbolTable.symbols[node.name] as FunctionSymbol).returnType ||
        node.parameters.toString() !==
          (symbolTable.symbols[node.name] as FunctionSymbol).params.toString())
    ) {
      throw new SemanticAnalysisError(
        `Redeclaration Error: Function '${
          node.name
        }' redeclared with conflicting type: '${node.returnType} ${
          node.name
        }(${node.parameters.join(", ")})' instead of '${
          (symbolTable.symbols[node.name] as FunctionSymbol).returnType
        } ${node.name}(${(
          symbolTable.symbols[node.name] as FunctionSymbol
        ).params.join(", ")})'`,
        sourceCode,
        node.position
      );
    }
  }
}

/**
 * Check for redefinition of a symbol.
 */
export function checkForRedefinition(
  sourceCode: string,
  node: FunctionDefinition | Initialization | ArrayInitialization,
  scope: Scope
) {
  if (node.name in scope.symbols && scope.symbols[node.name].isDefined) {
    throw new SemanticAnalysisError(
      `Redefinition error: Symbol '${name} redefined in scope'`,
      sourceCode,
      node.position
    );
  }
}

/**
 * Checks if a given variable is declared in the given scope.
 * TODO: add check that the expected type of this variable being used in expression is valid in that expression.
 */
export function checkForVariableDeclaration(
  sourceCode: string,
  node: VariableExpr,
  scope: Scope
) {
  let curr = scope;
  while (curr != null) {
    if (node.name in curr.symbols) {
      if (curr.symbols[node.name].type === "variable") {
        return;
      }
      throw new SemanticAnalysisError(
        `${node.name} is a ${curr.symbols[node.name].type}, not a variable`,
        sourceCode,
        node.position
      );
    }
    curr = curr.parentScope;
  }
  throw new SemanticAnalysisError(
    `Undeclared variable: '${node.name}' undeclared before use`,
    sourceCode,
    node.position
  );
}

export function checkForArrayDeclaration(
  sourceCode: string,
  node: ArrayElementExpr,
  scope: Scope
) {
  let curr = scope;
  while (curr != null) {
    if (node.name in curr.symbols) {
      if (curr.symbols[node.name].type === "array") {
        return;
      } else {
        throw new SemanticAnalysisError(
          `${node.name} is not an array type`,
          sourceCode,
          node.position
        );
      }
    }
    curr = curr.parentScope;
  }
  throw new SemanticAnalysisError(
    `Undeclared array: '${node.name}' undeclared before use`,
    sourceCode,
    node.position
  );
}

/**
 * Checks if a given function is declared.
 */
export function checkForFunctionDeclaration(
  sourceCode: string,
  node: FunctionCall | FunctionCallStatement,
  scope: Scope,
  specialFunctions: Set<string>
) {
  if (specialFunctions.has(node.expr)) {
    // one of the special pre-built functions
    return;
  }
  let curr = scope;
  while (curr != null) {
    if (node.expr in curr.symbols) {
      if (curr.symbols[node.expr].type === "function") {
        return;
      } else {
        throw new SemanticAnalysisError(
          `${node.expr} is not a function parameter`,
          sourceCode,
          node.position
        );
      }
    }
    curr = curr.parentScope;
  }
  throw new SemanticAnalysisError(
    `Undeclared function: '${node.expr}' undeclared before use`,
    sourceCode,
    node.position
  );
}

export function checkForFunctionParameterRedeclaration(
  sourceCode: string,
  node: FunctionDeclaration | FunctionDefinition
) {
  const params = new Set<string>();
  node.parameters.forEach((p) => {
    if (params.has(p.name)) {
      throw new SemanticAnalysisError(
        `Redeclaration error: function parameter ${p.name} redeclared`,
        sourceCode,
        node.position
      );
    }
    params.add(p.name);
  });
}
