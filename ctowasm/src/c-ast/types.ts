/**
 * Various types that are not AST nodes, but used as fields in AST nodes.
 */

import { ArrayDeclaration, ArrayInitialization } from "~src/c-ast/arrays";
import { FunctionDeclaration, FunctionDefinition } from "~src/c-ast/functions";
import { Initialization, VariableDeclaration } from "~src/c-ast/variable";
import { VariableType } from "~src/common/types";
import { ProcessingError } from "~src/errors";

/**
 * This file contains the typescript interfaces for each astNode.
 */
interface Point {
  line: number;
  offset: number;
  column: number;
}

export interface Position {
  start: Point;
  end: Point;
}

type SymbolType = "function" | "variable" | "array";

interface SymbolTableEntry {
  type: SymbolType;
  globalRecordId: number;
}

export interface FunctionSymbolEntry extends SymbolTableEntry {
  type: "function";
  parameters: VariableType[];
  returnType: VariableType | null;
}

export interface VariableSymbolEntry extends SymbolTableEntry {
  type: "variable";
  variableType: VariableType;
}

export interface ArraySymbolEntry extends SymbolTableEntry {
  type: "array";
  variableType: VariableType;
  numElements: number;
}

export class SymbolTable {
  parentTable: SymbolTable | null;
  symbols: Record<string, SymbolTableEntry>;
  globalRecord: GlobalSymbolRecord; // a special record that is shared over all symbol tables. Every symbol table entry can be identified with a unique id

  constructor(parentTable?: SymbolTable | null) {
    this.parentTable = parentTable ? parentTable : null;
    this.symbols = {};
    this.globalRecord = parentTable
      ? parentTable.globalRecord
      : new GlobalSymbolRecord();
  }

  addEntry(
    node:
      | VariableDeclaration
      | Initialization
      | ArrayDeclaration
      | ArrayInitialization
      | FunctionDeclaration
      | FunctionDefinition
  ) {
    let symbolEntry;
    const newId = this.globalRecord.getNextId();
    if (node.type === "VariableDeclaration" || node.type === "Initialization") {
      const newEntry: VariableSymbolEntry = {
        type: "variable",
        globalRecordId: newId,
        variableType: node.variableType,
      };
      symbolEntry = newEntry;
    } else if (
      node.type === "ArrayDeclaration" ||
      node.type === "ArrayInitialization"
    ) {
      const newEntry: ArraySymbolEntry = {
        type: "array",
        globalRecordId: newId,
        variableType: node.variableType,
        numElements: node.numElements,
      };
      symbolEntry = newEntry;
    } else if (
      node.type === "FunctionDeclaration" ||
      node.type === "FunctionDefinition"
    ) {
      const newEntry: FunctionSymbolEntry = {
        type: "function",
        globalRecordId: newId,
        parameters: node.parameters.map((p) => p.variableType),
        returnType: node.returnType,
      };
      symbolEntry = newEntry;
    } else {
      console.assert(
        false,
        "Processing Error: Unhandled node to add as symbol entry."
      );
    }

    this.globalRecord.addRecord(symbolEntry);
    this.symbols[node.name] = symbolEntry;
  }

  /**
   * Look up the symbol starting from the lowest symbol table (most recent).
   */
  getSymbolEntry(name: string): SymbolTableEntry {
    let curr: SymbolTable = this;
    while (curr !== null) {
      if (name in curr.symbols) {
        return curr.symbols[name];
      }
      curr = curr.parentTable;
    }
    throw new ProcessingError(
      `Processing error: Symbol ${name} not found in symbol table`
    );
  }
}

export class GlobalSymbolRecord {
  count: number; // number of stored symbols
  records: Record<number, SymbolTableEntry>;
  constructor() {
    this.count = 0;
    this.records = {};
  }

  getNextId() {
    return this.count;
  }

  addRecord(symbolTableEntry: SymbolTableEntry) {
    this.records[this.count++] = symbolTableEntry;
  }
}
