/**
 * Definitions of various utility functions.
 */

import { Block } from "~src/c-ast/core";
import { FunctionDefinition } from "~src/c-ast/functions";
import { ForLoop } from "~src/c-ast/loops";
import { SymbolTable } from "~src/processor/symbolTable";
import { getDataTypeSize } from "~src/common/utils";
import { ProcessingError } from "~src/errors";
import { visit } from "~src/processor/visit";

type ScopeCreatingNodes = FunctionDefinition | ForLoop | Block;

/**
 * Specially handles functions that involve creation of a new scope - which means a new symbol table.
 */
export function handleScopeCreatingNodes(
  sourceCode: string,
  node: ScopeCreatingNodes,
  symbolTable: SymbolTable,
  enclosingFunc?: FunctionDefinition
) {
  if (node.type === "FunctionDefinition") {
    const n = node as FunctionDefinition;
    // set the fields for tracking sizes as 0 - they will be incremented as more nodes are visited.
    n.sizeOfLocals = 0;
    // size of parameters can be calculated immediately
    n.sizeOfParameters = n.parameters.reduce(
      (sum, curr) => sum + getDataTypeSize(curr.dataType),
      0
    );
    n.sizeOfReturn = n.returnType ? getDataTypeSize(n.returnType) : 0;

    symbolTable.addEntry(n);

    // visit params
    const paramSymbolTable = new SymbolTable(symbolTable);
    visit(sourceCode, n.parameters, paramSymbolTable);

    // visit body
    visit(sourceCode, n.body, paramSymbolTable, n);
  } else if (node.type === "Block") {
    const n = node as Block;
    const blockSymbolTable = new SymbolTable(symbolTable);
    n.children.forEach((child) =>
      visit(sourceCode, child, blockSymbolTable, enclosingFunc)
    );
  } else if (node.type === "ForLoop") {
    // for loops have a specific scope for the for loop bracketed statements e.g. "(int i = 0; i < 10; i++)"
    const n = node as ForLoop;
    const forLoopSymbolTable = new SymbolTable(symbolTable);
    visit(sourceCode, n.initialization, forLoopSymbolTable, enclosingFunc);
    visit(sourceCode, n.condition, forLoopSymbolTable, enclosingFunc);
    visit(sourceCode, n.update, forLoopSymbolTable, enclosingFunc);
    visit(sourceCode, n.body, forLoopSymbolTable, enclosingFunc);
  } else {
    throw new ProcessingError("Unhandled scope creating node.");
  }
}
