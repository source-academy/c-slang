import { ENUM_DATA_TYPE } from "~src/common/constants";
import { DataType, FunctionDataType } from "../parser/c-ast/dataTypes";
import { ProcessingError, toJson } from "~src/errors";
import { VariableDeclaration } from "~src/parser/c-ast/declaration";
import { FunctionDetails } from "~src/processor/c-ast/function";
import { getDataTypeSize, unpackDataType } from "~src/processor/dataTypeUtil";

/**
 * Definition of symbol table used by processor and semantic analyser
 */
export type SymbolEntry =
  | FunctionSymbolEntry
  | VariableSymbolEntry
  | EnumeratorSymbolEntry;
export interface FunctionSymbolEntry {
  type: "function";
  dataType: FunctionDataType;
  processedFunctionDetails: FunctionDetails; // process and save the function details
}

/**
 * Represent an enumerators present within Enum declarations.
 * Such enumerators can be used like constants.
 */
export interface EnumeratorSymbolEntry {
  type: "enumerator";
  dataType: { type: "primary"; primaryDataType: typeof ENUM_DATA_TYPE }; // in this compiler implementation enums directly correspond to signed ints
  value: bigint;
}

export interface VariableSymbolEntry {
  type: "localVariable" | "dataSegmentVariable";
  dataType: DataType;
  offset: number; // offset in number of bytes of this from the first byte of the first encountered symbol in the same function OR global scope
}

export class SymbolTable {
  parentTable: SymbolTable | null;
  currOffset: { value: number }; // current offset saved as "value" in an object. Used to make it sharable as a reference across tables
  staticVariables: { declaration: VariableDeclaration; offset: number }[]; // keep track of all static variables that were declared
  dataSegmentOffset: { value: number }; // current offset in dataSegment. only global variables and static storage class variables increase this.
  symbols: Record<string, SymbolEntry>;
  externalFunctions: Record<string, FunctionSymbolEntry>;

  constructor(parentTable?: SymbolTable | null) {
    this.parentTable = parentTable ? parentTable : null;
    this.symbols = {};
    this.externalFunctions = parentTable ? parentTable.externalFunctions : {};
    if (!parentTable) {
      this.dataSegmentOffset = { value: 0 };
      this.staticVariables = [];
    } else {
      this.dataSegmentOffset = parentTable.dataSegmentOffset;
      this.staticVariables = parentTable.staticVariables;
    }
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
      this.addFunctionEntry(funcName, externalFunctions[funcName], true);
    }
    return this.externalFunctions;
  }

  isExternalFunction(funcName: string) {
    return funcName in this.externalFunctions;
  }

  addEntry(declaration: VariableDeclaration): SymbolEntry {
    if (declaration.dataType.type === "function") {
      return this.addFunctionEntry(declaration.name, declaration.dataType);
    } else {
      if (declaration.storageClass === "static") {
        this.staticVariables.push({
          declaration,
          offset: this.dataSegmentOffset.value,
        });
      }
      return this.addVariableEntry(
        declaration.name,
        declaration.dataType,
        declaration.storageClass,
      );
    }
  }

  addEnumeratorEntry(
    enumeratorName: string,
    enumeratorValue: bigint,
  ): EnumeratorSymbolEntry {
    const entry: EnumeratorSymbolEntry = {
      type: "enumerator",
      dataType: { type: "primary", primaryDataType: ENUM_DATA_TYPE },
      value: enumeratorValue,
    };
    this.symbols[enumeratorName] = entry;
    return entry;
  }

  addVariableEntry(
    name: string,
    dataType: DataType,
    storageClass: "auto" | "static",
  ): VariableSymbolEntry {
    if (name in this.symbols) {
      // given variable already exists in given scope
      // multiple declarations only allowed outside of function bodies
      if (this.parentTable !== null) {
        throw new ProcessingError(`${name} redeclared`);
      }
      const symbolEntry = this.symbols[name];
      if (
        symbolEntry.type === "function" ||
        symbolEntry.type === "enumerator"
      ) {
        throw new ProcessingError(`${name} redeclared`);
      }

      if (toJson(symbolEntry.dataType) !== toJson(dataType)) {
        throw new ProcessingError(
          `Conflicting types for ${name}:  redeclared as ${symbolEntry} instead of ${toJson(
            dataType,
          )}`,
        ); //TODO: stringify there datatype in english instead of just printing json
      }
      return this.symbols[name] as VariableSymbolEntry;
    }

    let entry: SymbolEntry;
    if (this.parentTable === null) {
      // the offset grows inthe positive direction (low to high adress) for globals
      entry = {
        type: "dataSegmentVariable",
        dataType: dataType,
        offset: this.dataSegmentOffset.value,
      };
      this.dataSegmentOffset.value += getDataTypeSize(dataType);
    } else {
      if (storageClass === "static") {
        entry = {
          type: "dataSegmentVariable",
          dataType: dataType,
          offset: this.dataSegmentOffset.value,
        };
        this.dataSegmentOffset.value += getDataTypeSize(dataType);
      } else if (storageClass === "auto") {
        // offset grows in negative direction (high to low adderss) for locals
        this.currOffset.value -= getDataTypeSize(dataType);
        entry = {
          type: "localVariable",
          dataType: dataType,
          offset: this.currOffset.value,
        };
      } else {
        throw new ProcessingError(
          "addVariableEntry(): Unhandled storage class",
        );
      }
    }
    this.symbols[name] = entry;
    return entry;
  }

  addFunctionEntry(
    name: string,
    dataType: FunctionDataType,
    isExternalFunction?: boolean,
  ): FunctionSymbolEntry {
    if (!isExternalFunction && name in this.symbols) {
      // function was already declared before
      // simple check that symbol is a function and the params and return types match
      if (this.symbols[name].type !== "function") {
        throw new ProcessingError(
          `${name} redeclared as different kind of symbol: function instead of variable`,
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
          "Array is not a valid return type from a function",
        );
      }

      functionDetails.sizeOfReturn += getDataTypeSize(dataType.returnType);
      // offset is relative to 1 byte past the last return object, thus negative (from high to low address)
      functionDetails.returnObjects = unpackDataType(dataType.returnType).map(
        (scalarDataType) => ({
          dataType: scalarDataType.dataType,
          offset: scalarDataType.offset - functionDetails.sizeOfReturn,
        }),
      );
    }

    let offset = 0;
    for (const param of dataType.parameters) {
      // sanity check, as parser should have converted all array params into pointers.
      if (param.type === "array") {
        throw new ProcessingError(
          "Compiler error: The type of a function parameter should not be an array after parsing",
        );
      }
      const dataTypeSize = getDataTypeSize(param);
      offset -= dataTypeSize;
      functionDetails.sizeOfParams += dataTypeSize;
      const unpackedParam = unpackDataType(param).map((scalarDataType) => ({
        dataType: scalarDataType.dataType,
        offset: offset + scalarDataType.offset, // offset of entire aggregate object + offset of particular sacalar data type within object
      }));
      // need to load unpacked param in reverse order, as in stack frame creation, the highest address subobject of an aggregate type gets loaded first as the stack frame grows from high to low address
      functionDetails.parameters.push(...unpackedParam.reverse());
    }

    const entry: FunctionSymbolEntry = {
      type: "function",
      dataType,
      processedFunctionDetails: functionDetails,
    };

    if (isExternalFunction) {
      this.externalFunctions[name] = entry;
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
