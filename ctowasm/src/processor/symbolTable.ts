import { DataType, FunctionDataType } from "../parser/c-ast/dataTypes";
import { ProcessingError, toJson } from "~src/errors";
import { Declaration } from "~src/parser/c-ast/declaration";
import { FunctionDetails } from "~src/processor/c-ast/function";
import { getDataTypeSize, unpackDataType } from "~src/processor/dataTypeUtil";

/**
 * Definition of symbol table used by processor and semantic analyser
 */
export type SymbolEntry = FunctionSymbolEntry | VariableSymbolEntry;
export interface FunctionSymbolEntry {
  type: "function";
  dataType: FunctionDataType;
  processedFunctionDetails: FunctionDetails; // process and save the function details
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
  externalFunctions: Record<string, FunctionSymbolEntry>;

  constructor(parentTable?: SymbolTable | null) {
    this.parentTable = parentTable ? parentTable : null;
    this.symbols = {};
    this.externalFunctions = parentTable ? parentTable.externalFunctions : {};
    if (!parentTable || parentTable.parentTable === null) {
      // all tables take the previous tables offset except the top 2 level parenttables
      // root table (1st level) is the global scope
      // 2nd level table is function scope
      this.currOffset = { value: 0 };
    } else {
      this.currOffset = parentTable.currOffset;
    }
  }

  setExternalFunctions(externalFunctions: Record<string, FunctionDataType>) {
    this.externalFunctions = {};
    for (const funcName of Object.keys(externalFunctions)) {
      this.addFunctionEntry(funcName, externalFunctions[funcName], true)
    }
    return this.externalFunctions;
  }

  isExternalFunction(funcName: string) {
    return funcName in this.externalFunctions;
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

    let entry: SymbolEntry;
    if (this.parentTable === null) {
      // the offset grows inthe positive direction (low to high adress) for globals
      entry = {
        type: "globalVariable",
        dataType: dataType,
        offset: this.currOffset.value,
      };
      this.currOffset.value += getDataTypeSize(dataType);
    } else {
      // offset grows in negative direction (high to low adderss) for locals
      this.currOffset.value -= getDataTypeSize(dataType);
      entry = {
        type: "localVariable",
        dataType: dataType,
        offset: this.currOffset.value,
      };
    }
    this.symbols[name] = entry;
    return entry;
  }

  addFunctionEntry(
    name: string,
    dataType: FunctionDataType,
    isExternalFunction?: boolean 
  ): FunctionSymbolEntry {
    if (!isExternalFunction && name in this.symbols) {
      // function was already declared before
      // simple check that symbol is a function and the params and return types match
      if (this.symbols[name].type !== "function") {
        throw new ProcessingError(
          `${name} redeclared as different kind of symbol: function instead of variable`
        );
      }

      // TODO: add proper existing declaration type checking in future
      // // if (
      // //   toJson(
      // //     (this.symbols[name] as FunctionSymbolEntry).dataType.parameters
      // //   ) !== toJson(dataType.parameters.toString())
      // // ) {
      // //   throw new ProcessingError(
      // //     `${name} redeclared as function with different signature: different parameters`
      // //   );
      
      // // const existingEntry = this.symbols[name] as FunctionSymbolEntry

      // // for (let i = 0; i < existingEntry.dataType.parameters.length; i++) {
      // //   if ()
      // // }

      // if (
      //   toJson(
      //     (this.symbols[name] as FunctionSymbolEntry).dataType.returnType
      //   ) !== toJson(dataType.returnType)
      // ) {
      //   throw new ProcessingError(
      //     `${name} redeclared as function with different signature: different return type`
      //   );
      // }

      return this.symbols[name] as FunctionSymbolEntry;
    }

    // Create function details
    const functionDetails: FunctionDetails = {
      sizeOfParams: 0,
      sizeOfReturn: 0,
      parameters: [],
      returnObjects: null,
    };

    if (dataType.returnType !== null) {
      if (dataType.returnType.type === "array") {
        throw new ProcessingError(
          "Array is not a valid return type from a function"
        );
      }

      functionDetails.sizeOfReturn += getDataTypeSize(dataType.returnType);
      // offset is relative to 1 byte past the last return object, thus negative (from high to low address)
      functionDetails.returnObjects = unpackDataType(dataType.returnType).map(
        (scalarDataType) => ({
          dataType: scalarDataType.dataType,
          offset: scalarDataType.offset - functionDetails.sizeOfReturn,
        })
      );
    }

    let offset = 0;
    for (const param of dataType.parameters) {
      const dataTypeSize = getDataTypeSize(param);
      offset -= dataTypeSize;
      functionDetails.sizeOfParams += dataTypeSize;
      functionDetails.parameters.push(
        ...(unpackDataType(param).map((scalarDataType) => ({
          dataType: scalarDataType.dataType,
          offset: offset + scalarDataType.offset, // offset of entire aggregate object + offset of particular sacalar data type within object
        })))
      );
    }

    const entry: FunctionSymbolEntry = {
      type: "function",
      dataType,
      processedFunctionDetails: functionDetails
    };

    if (isExternalFunction) {
      this.externalFunctions[name] = entry
    } else {
      this.symbols[name] = entry;
    }
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

    if (name in this.externalFunctions) {
      return this.externalFunctions[name];
    }

    throw new ProcessingError(`Symbol '${name}' not found in symbol table`);
  }
}
