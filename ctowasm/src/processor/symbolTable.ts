import { ENUM_DATA_TYPE } from "~src/common/constants";
import { DataType, FunctionDataType } from "../parser/c-ast/dataTypes";
import { ProcessingError, toJson } from "~src/errors";
import { VariableDeclaration } from "~src/parser/c-ast/declaration";
import { FunctionDetails } from "~src/processor/c-ast/function";
import {
  convertFunctionDataTypeToFunctionDetails,
  getDataTypeSize,
} from "~src/processor/dataTypeUtil";
import ModuleRepository, { ModuleName } from "~src/modules";
import { unpackDataSegmentInitializerAccordingToDataType } from "~src/processor/processDeclaration";
import { convertIntegerToByteString } from "~src/processor/byteStrUtil";

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
  functionDetails: FunctionDetails; // process and save the function details
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

export type FunctionTable = FunctionTableEntry[]

export interface FunctionTableEntry {
  functionName: string;
  functionDetails: FunctionDetails;
  isDefined: boolean // whether the given function has been defined
}

export class SymbolTable {
  parentTable: SymbolTable | null;
  currOffset: { value: number }; // current offset saved as "value" in an object. Used to make it sharable as a reference across tables
  dataSegmentByteStr: { value: string }; // the string of bytes that forms the data segment
  dataSegmentOffset: { value: number }; // the current offset at data segment (address of next allocated data segment object)
  functionTable: FunctionTableEntry[]; // list of all functions declared in the program in one table 
  functionTableIndexes: Record<string, number>; // map function name to index in functionTable for fast lookup
  symbols: Record<string, SymbolEntry>;
  externalFunctions: Record<string, FunctionSymbolEntry>;

  constructor(parentTable?: SymbolTable | null) {
    this.symbols = {};

    if (parentTable) {
      this.externalFunctions = parentTable.externalFunctions;
      this.parentTable = parentTable;
      this.dataSegmentByteStr = parentTable.dataSegmentByteStr;
      this.dataSegmentOffset = parentTable.dataSegmentOffset;
      this.functionTable = parentTable.functionTable;
      this.functionTableIndexes = parentTable.functionTableIndexes;
    } else {
      this.externalFunctions = {};
      this.parentTable = null;
      this.dataSegmentByteStr = { value: "" };
      this.dataSegmentOffset = { value: 0 };
      this.functionTable = [];
      this.functionTableIndexes = {};
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

  /**
   * Add all the functions of imoprted modules to global scope.
   */
  setExternalFunctions(
    includedModules: ModuleName[],
    moduleRepository: ModuleRepository
  ) {
    this.externalFunctions = {};
    for (const moduleName of includedModules) {
      Object.keys(moduleRepository.modules[moduleName].moduleFunctions).forEach(
        (funcName) => {
          this.addFunctionEntry(
            funcName,
            moduleRepository.modules[moduleName].moduleFunctions[funcName]
              .functionType,
            true
          );
          this.setFunctionIsDefinedFlag(funcName);
        }
      );
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
      if (this.parentTable === null || declaration.storageClass === "static") {
        // the declaration is either a global or static
        // allocate space for and the initializer bytes for this declared object in data segment
        this.dataSegmentByteStr.value +=
          unpackDataSegmentInitializerAccordingToDataType(
            declaration.dataType,
            typeof declaration.initializer === "undefined"
              ? null
              : declaration.initializer
          );
      }
      return this.addVariableEntry(
        declaration.name,
        declaration.dataType,
        declaration.storageClass
      );
    }
  }

  addEnumeratorEntry(
    enumeratorName: string,
    enumeratorValue: bigint
  ): EnumeratorSymbolEntry {
    const entry: EnumeratorSymbolEntry = {
      type: "enumerator",
      dataType: { type: "primary", primaryDataType: ENUM_DATA_TYPE },
      value: enumeratorValue,
    };
    this.symbols[enumeratorName] = entry;
    return entry;
  }

  /**
   * Allocate bytes on data segment
   * Adds the initializing bytes to the dataSegmentByteStr as well.
   * @params the array of bytes (in demical numeric form) to put on data segment.
   * @returns offset in data segment of the allocated object.
   */
  addDataSegmentObject(bytes: number[]): number {
    bytes.forEach((byte) => {
      this.dataSegmentByteStr.value += convertIntegerToByteString(
        BigInt(byte),
        1
      );
    });
    const offset = this.dataSegmentOffset.value;
    this.dataSegmentOffset.value += bytes.length;
    return offset;
  }

  addVariableEntry(
    name: string,
    dataType: DataType,
    storageClass: "auto" | "static"
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
            dataType
          )}`
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
          "addVariableEntry(): Unhandled storage class"
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

    const entry: FunctionSymbolEntry = {
      type: "function",
      dataType,
      functionDetails: convertFunctionDataTypeToFunctionDetails(dataType),
    };

    if (isExternalFunction) {
      this.externalFunctions[name] = entry;
    } else {
      this.symbols[name] = entry;
    }

    this.functionTable.push({functionName: name, functionDetails: entry.functionDetails, isDefined: false});
    this.functionTableIndexes[name] = this.functionTable.length - 1;
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

  /**
   * Returns the index of function with given name in the functionTable
   */
  getFunctionIndex(name: string) {
    return this.functionTableIndexes[name];
  }

  /**
   * Set the isDefined flag for the given function to true.
   */
  setFunctionIsDefinedFlag(functionName: string) {
    this.functionTable[this.getFunctionIndex(functionName)].isDefined = true;
  }
}
