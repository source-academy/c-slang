import { ArrayDeclaration, ArrayInitialization } from "~src/c-ast/arrays";
import { FunctionDeclaration, FunctionDefinition } from "~src/c-ast/functions";
import { VariableDeclaration, Initialization } from "~src/c-ast/variable";
import { VariableType } from "~src/common/types";
import { ProcessingError } from "~src/errors";

type SymbolType = "function" | "variable" | "array";

interface SymbolTableEntry {
  type: SymbolType;
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

  constructor(parentTable?: SymbolTable | null) {
    this.parentTable = parentTable ? parentTable : null;
    this.symbols = {};
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
    if (node.type === "VariableDeclaration" || node.type === "Initialization") {
      const newEntry: VariableSymbolEntry = {
        type: "variable",
        variableType: node.variableType,
      };
      symbolEntry = newEntry;
    } else if (
      node.type === "ArrayDeclaration" ||
      node.type === "ArrayInitialization"
    ) {
      const newEntry: ArraySymbolEntry = {
        type: "array",
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
        parameters: node.parameters.map((p) => p.variableType),
        returnType: node.returnType,
      };
      symbolEntry = newEntry;
    } else {
      throw new ProcessingError("Unhandled node to add as symbol entry.");
    }

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
    throw new ProcessingError(`Symbol ${name} not found in symbol table`);
  }
}
