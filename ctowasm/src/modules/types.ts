import { ModulesGlobalConfig, SharedWasmGlobalVariables } from "~src/modules";
import { PixAndFlixExternalLibrayFunctions } from "~src/modules/pix_and_flix/types";
import { MemoryBlock } from "~src/modules/source_stdlib/memory";
import { FunctionDataType, StructDataType } from "~src/parser/c-ast/dataTypes";

// Configuration parameters for WasmModuleImports object

export interface ImportedModulesGlobalConfig {
  printFunction?: (str: string) => void; // the print function to use for printing to "stdout"
  externalFunctions?: {[functionName: string]: Function}
}
// Defines the signature of a wasm imported function

export interface ModuleFunction {
  parentImportedObject: string; // parent imported object
  functionType: FunctionDataType;
  // eslint-disable-next-line
  jsFunction: Function; // the actual JS function that is called
}

/**
 * Base class for all Modules.
 */
export abstract class Module {
  memory: WebAssembly.Memory;
  functionTable: WebAssembly.Table;
  config: ModulesGlobalConfig;
  freeList: MemoryBlock[] = [];
  allocatedBlocks: Map<number, number> = new Map(); // allocated memory blocks <address, size>
  sharedWasmGlobalVariables: SharedWasmGlobalVariables;
  abstract moduleDeclaredStructs: StructDataType[];
  abstract moduleFunctions: Record<string, ModuleFunction>; // all the functions within this module

  constructor(memory: WebAssembly.Memory, functionTable: WebAssembly.Table, config: ModulesGlobalConfig, sharedWasmGlobalVariables: SharedWasmGlobalVariables) {
    this.memory = memory;
    this.functionTable = functionTable;
    this.config = config;
    this.sharedWasmGlobalVariables = sharedWasmGlobalVariables;
  }

  /**
   * Print to "stdout" by calling the printFunction defined in config.
   */
  print(str: string) {
    this.config.printFunction(str);
  }
}
