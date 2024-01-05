import {
  FunctionDeclaration,
  FunctionDefinition,
} from "~src/parser/c-ast/function";
import {
  VariableDeclaration,
  Initialization,
} from "~src/parser/c-ast/variable";
import { DataType } from "~src/common/types";
import { ProcessingError, toJson } from "~src/errors";
import { getDataTypeSize } from "~src/common/utils";

/**
 * Definition of symbol table used by processor and semantic analyser
 */
export type SymbolEntry = FunctionSymbolEntry | VariableSymbolEntry;
export interface FunctionSymbolEntry {
  type: "function";
  returnType: DataType | null;
  parameters: DataType[];
}

export interface VariableSymbolEntry {
  type: "localVariable" | "globalVariable";
  dataType: DataType;
  offset: number; // offset in number of bytes of this from the first byte of the first encountered symbol in the same function OR global scope
}

export class SymbolTable {
  parentTable: SymbolTable | null;
  currOffset: { value: number }; // current offset saved as "value" in an object. Used to make it sharable as a reference across tables
  symbols: Record<string, SymbolEntry>;

  constructor(parentTable?: SymbolTable | null) {
    this.parentTable = parentTable ? parentTable : null;
    this.symbols = {};
    if (!parentTable || parentTable.parentTable === null) {
      // all tables take the previous tables offset except the top 2 level parenttables
      // root table (1st level) is the global scope
      // 2nd level table is function scope
      this.currOffset = { value: 0 };
    } else {
      this.currOffset = parentTable.currOffset;
    }
  }

  addVariableEntry(name: string, dataType: DataType): VariableSymbolEntry {
    if (name in this.symbols) {
      // given variable already exists in given scope
      // multiple declarations only allowed outside of function bodies
      if (this.parentTable !== null) {
        throw new ProcessingError(
          `Redeclaration error: ${name} redeclared in scope.`
        );
      }
      if (this.symbols[name].type === "function") {
        throw new ProcessingError(`Redeclaration error: ${name} redeclared as variable instead of function`)
      }
      return this.symbols[name] as VariableSymbolEntry;
    }
    const entry: SymbolEntry = {
      type: this.parentTable === null ? "globalVariable" : "localVariable",
      dataType: dataType,
      offset: this.currOffset.value,
    };
    this.symbols[name] = entry;
    this.currOffset.value += getDataTypeSize(dataType);
    return entry;
  }

  addFunctionEntry(
    name: string,
    parameters: DataType[],
    returnType: DataType | null
  ) {
    if (name in this.symbols) {
      // function was already declared before
      // simple check that symbol is a function and the params and return types match
      if (this.symbols[name].type !== "function") {
        throw new ProcessingError(
          `${name} redeclared as different kind of symbol: function instead of variable`
        );
      }

      if (
        toJson((this.symbols[name] as FunctionSymbolEntry).parameters) !==
        toJson(parameters)
      ) {
        throw new ProcessingError(
          `${name} redeclared as function with different signature: different parameters`
        );
      }

      if (
        toJson((this.symbols[name] as FunctionSymbolEntry).returnType) !==
        toJson(returnType)
      ) {
        throw new ProcessingError(
          `${name} redeclared as function with different signature: different return type`
        );
      }

      return;
    }
    this.symbols[name] = {
      type: "function",
      returnType,
      parameters,
    };
  }

  /**
   * Look up the symbol starting from the lowest symbol table (most recent).
   */
  getSymbolEntry(name: string): SymbolEntry {
    let curr: SymbolTable | null = this;
    while (curr !== null) {
      if (name in curr.symbols) {
        return curr.symbols[name];
      }
      curr = curr.parentTable;
    }
    throw new ProcessingError(`Symbol ${name} not found in symbol table`);
  }
}
