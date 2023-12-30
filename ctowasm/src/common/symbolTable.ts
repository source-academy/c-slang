import { FunctionDeclaration, FunctionDefinition } from "~src/c-ast/functions";
import { VariableDeclaration, Initialization } from "~src/c-ast/variable";
import { VariableType } from "~src/common/types";
import { ProcessingError } from "~src/errors";

/**
 * Definition of symbol table used by processor and semantic analyser
 */
export type SymbolEntry = FunctionSymbolEntry | VariableSymbolEntry;
export interface FunctionSymbolEntry {
  type: "function";
  returnType: VariableType | null;
  parameters: VariableType[];
}
export interface VariableSymbolEntry {
  type: "variable";
  variableType: VariableType;
}

export class SymbolTable {
  parentTable: SymbolTable | null;
  symbols: Record<string, SymbolEntry>;

  constructor(parentTable?: SymbolTable | null) {
    this.parentTable = parentTable ? parentTable : null;
    this.symbols = {};
  }

  addEntry(
    node:
      | VariableDeclaration
      | Initialization
      | FunctionDeclaration
      | FunctionDefinition
  ) {
    if (node.type === "VariableDeclaration" || node.type === "Initialization") {
      this.symbols[node.name] = {
        type: "variable",
        variableType: node.variableType,
      };
    } else {
      this.symbols[node.name] = {
        type: "function",
        returnType: node.returnType,
        parameters: node.parameters.map((varDec) => varDec.variableType),
      };
    }
  }

  /**
   * Look up the symbol starting from the lowest symbol table (most recent).
   */
  getSymbolEntry(name: string): SymbolEntry {
    let curr: SymbolTable = this;
    while (curr !== null) {
      if (name in curr.symbols) {
        return curr.symbols[name];
      }
      curr = curr.parentTable;
    }
    throw new ProcessingError(`Symbol ${name} not found in symbol table`);
  }
}
