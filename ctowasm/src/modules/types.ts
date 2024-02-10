import { ModulesGlobalConfig } from "~src/modules";
import { FunctionDataType, StructDataType } from "~src/parser/c-ast/dataTypes";

// Configuration parameters for WasmModuleImports object

export interface ImportedModulesGlobalConfig {
  printFunction?: (str: string) => void; // the print function to use for printing to "stdout"
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
  config: ModulesGlobalConfig;
  abstract moduleDeclaredStructs: StructDataType[];
  abstract moduleFunctions: Record<string, ModuleFunction>; // all the functions within this module

  constructor(memory: WebAssembly.Memory, config: ModulesGlobalConfig) {
    this.memory = memory;
    this.config = config;
  }

  /**
   * Print to "stdout" by calling the printFunction defined in config.
   */
  print(str: string) {
    this.config.printFunction(str);
  }
}
