import {
  SourceStandardLibraryModule,
  sourceStandardLibraryModuleImportName,
} from "~src/modules/source_stdlib";
import { Module } from "~src/modules/types";

export interface ModulesGlobalConfig {
  printFunction: (str: string) => void; // the print function to use for printing to "stdout"
}

const defaultModulesGlobalConfig: ModulesGlobalConfig = {
  printFunction: (str: string) => console.log(str),
};

// all the names of the modules
export type ModuleName = typeof sourceStandardLibraryModuleImportName;

/**
 * Holds all the modules that define functions that can be imported and used in C source program.
 */
export default class ModuleRepository {
  memory: WebAssembly.Memory;
  config: ModulesGlobalConfig;
  modules: Record<ModuleName, Module>;

  constructor(memory: WebAssembly.Memory, config?: ModulesGlobalConfig) {
    this.memory = memory;
    if (config) {
      this.config = { ...defaultModulesGlobalConfig, ...config };
    } else {
      this.config = defaultModulesGlobalConfig;
    }

    this.modules = {
      [sourceStandardLibraryModuleImportName]: new SourceStandardLibraryModule(
        this.memory,
        this.config
      ),
    };
  }

  /**
   * Returns the object that can be used as argument to Webassembly.instantiate.
   * @param importedModules the names of all modules that are being imported and used in a particular compiled wasm output file.
   */
  createWasmImportsObject(importedModules?: ModuleName[]): WebAssembly.Imports {
    const imports: WebAssembly.Imports = {
      js: { mem: this.memory },
    };

    if (typeof importedModules === "undefined") {
      // import all modules
      Object.keys(this.modules).forEach((moduleName) => {
        const module = this.modules[moduleName as ModuleName];
        const moduleImports: WebAssembly.ModuleImports = {};
        Object.keys(this.modules[moduleName as ModuleName].moduleFunctions).map(
          (moduleFunctionName) => {
            moduleImports[moduleFunctionName] = module.moduleFunctions[moduleFunctionName]
              .jsFunction;
          }
        );
      });
      return imports;
    }
    
    importedModules.forEach((moduleName) => {
      const module = this.modules[moduleName];
      const moduleImports: WebAssembly.ModuleImports = {};
      Object.keys(this.modules[moduleName].moduleFunctions).map(
        (moduleFunctionName) => {
          moduleImports[moduleFunctionName] = module.moduleFunctions[moduleFunctionName]
            .jsFunction;
        }
      );
    });

    return imports;
  }
}
