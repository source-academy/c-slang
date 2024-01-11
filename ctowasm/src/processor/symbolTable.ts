import { DataType, FunctionDataType } from "../parser/c-ast/dataTypes";
import { ProcessingError, toJson } from "~src/errors";
import { Declaration } from "~src/parser/c-ast/declaration";
import { Position } from "~src/parser/c-ast/misc";
import { getDataTypeSize } from "~src/processor/dataTypeUtil";

/**
 * Definition of symbol table used by processor and semantic analyser
 */
export type SymbolEntry = FunctionSymbolEntry | VariableSymbolEntry;
export interface FunctionSymbolEntry {
  type: "function";
  dataType: FunctionDataType;
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

  addEntry(declaration: Declaration): SymbolEntry {
    if (declaration.dataType.type === "function") {
      return this.addFunctionEntry(declaration.name, declaration.dataType);
    } else {
      return this.addVariableEntry(declaration.name, declaration.dataType);
    }
  }

  addVariableEntry(name: string, dataType: DataType): VariableSymbolEntry {
    if (name in this.symbols) {
      // given variable already exists in given scope
      // multiple declarations only allowed outside of function bodies
      if (this.parentTable !== null) {
        throw new ProcessingError(`${name} redeclared in scope.`);
      }
      if (this.symbols[name].type === "function") {
        throw new ProcessingError(
          `${name} redeclared as variable instead of function`
        );
      }

      if (toJson(this.symbols[name].dataType) !== toJson(dataType)) {
        throw new ProcessingError(
          `Conflicting types for ${name}:  redeclared as ${
            this.symbols[name].dataType
          } instead of ${toJson(dataType)}`
        ); //TODO: stringify there datatype in english instead of just printing json
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

  addFunctionEntry(name: string, dataType: FunctionDataType): FunctionSymbolEntry {
    if (name in this.symbols) {
      // function was already declared before
      // simple check that symbol is a function and the params and return types match
      if (this.symbols[name].type !== "function") {
        throw new ProcessingError(
          `${name} redeclared as different kind of symbol: function instead of variable`
        );
      }

      if (
        toJson(
          (this.symbols[name] as FunctionSymbolEntry).dataType.parameters
        ) !== toJson(dataType.parameters.toString())
      ) {
        throw new ProcessingError(
          `${name} redeclared as function with different signature: different parameters`
        );
      }

      if (
        toJson(
          (this.symbols[name] as FunctionSymbolEntry).dataType.returnType
        ) !== toJson(dataType.returnType)
      ) {
        throw new ProcessingError(
          `${name} redeclared as function with different signature: different return type`
        );
      }

      return this.symbols[name] as FunctionSymbolEntry;
    }
    const entry = {
      type: "function",
      dataType,
    } as FunctionSymbolEntry;

    this.symbols[name] = entry;
    return entry;
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
