import { VariableDeclaration, Initialization } from "~src/c-ast/variable";
import { VariableType } from "~src/common/types";
import { ProcessingError } from "~src/errors";

export class SymbolTable {
  parentTable: SymbolTable | null;
  symbols: Record<string, VariableType>;

  constructor(parentTable?: SymbolTable | null) {
    this.parentTable = parentTable ? parentTable : null;
    this.symbols = {};
  }

  addEntry(
    node: VariableDeclaration | Initialization
  ) {
    this.symbols[node.name] = node.variableType;
  }

  /**
   * Look up the symbol starting from the lowest symbol table (most recent).
   */
  getSymbolEntry(name: string): VariableType {
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
