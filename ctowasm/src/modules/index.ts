import { MathStdLibModule, mathStdlibName } from "~src/modules/math";
import {
  PixAndFlixLibrary,
  pixAndFlixLibraryModuleImportName,
} from "~src/modules/pix_and_flix";
import {
  SourceStandardLibraryModule,
  sourceStandardLibraryModuleImportName,
} from "~src/modules/source_stdlib";
import {
  SoundLibraryModule,
  soundLibraryModuleImportName,
} from "~src/modules/sound";
import {
  PlotlyLibraryModule,
  plotlyLibraryModuleImportName,
} from "~src/modules/plotly";
import { Module } from "~src/modules/types";
import { UtilityStdLibModule, utilityStdLibName } from "~src/modules/utility";
import { WASM_ADDR_TYPE } from "~src/translator/memoryUtil";

export interface ModulesGlobalConfig {
  printFunction: (str: string) => void; // the print function to use for printing to "stdout"
  externalFunctions?: { [functionName: string]: Function };
}

const defaultModulesGlobalConfig: ModulesGlobalConfig = {
  printFunction: (str: string) => console.log(str),
};

export interface SharedWasmGlobalVariables {
  stackPointer: WebAssembly.Global;
  heapPointer: WebAssembly.Global;
  basePointer: WebAssembly.Global;
}

// all the names of the modules
export type ModuleName =
  | typeof sourceStandardLibraryModuleImportName
  | typeof pixAndFlixLibraryModuleImportName
  | typeof mathStdlibName
  | typeof utilityStdLibName
  | typeof soundLibraryModuleImportName
  | typeof plotlyLibraryModuleImportName;

/**
 * Holds all the modules that define functions that can be imported and used in C source program.
 */
export default class ModuleRepository {
  memory: WebAssembly.Memory;
  functionTable: WebAssembly.Table; // table of functions of webassembly module
  config: ModulesGlobalConfig;
  modules: Record<ModuleName, Module>;
  sharedWasmGlobalVariables: SharedWasmGlobalVariables;

  constructor(
    memory?: WebAssembly.Memory,
    functionTable?: WebAssembly.Table,
    config?: ModulesGlobalConfig,
  ) {
    this.memory = memory ?? new WebAssembly.Memory({ initial: 0 });
    this.functionTable =
      functionTable ??
      new WebAssembly.Table({ element: "anyfunc", initial: 0 });
    this.config = config
      ? { ...defaultModulesGlobalConfig, ...config }
      : defaultModulesGlobalConfig;

    this.sharedWasmGlobalVariables = {
      stackPointer: new WebAssembly.Global(
        { value: WASM_ADDR_TYPE, mutable: true },
        0,
      ),
      basePointer: new WebAssembly.Global(
        { value: WASM_ADDR_TYPE, mutable: true },
        0,
      ),
      heapPointer: new WebAssembly.Global(
        { value: WASM_ADDR_TYPE, mutable: true },
        0,
      ),
    };

    this.modules = {
      [sourceStandardLibraryModuleImportName]: new SourceStandardLibraryModule(
        this.memory,
        this.functionTable,
        this.config,
        this.sharedWasmGlobalVariables,
      ),
      [pixAndFlixLibraryModuleImportName]: new PixAndFlixLibrary(
        this.memory,
        this.functionTable,
        this.config,
        this.sharedWasmGlobalVariables,
      ),
      [mathStdlibName]: new MathStdLibModule(
        this.memory,
        this.functionTable,
        this.config,
        this.sharedWasmGlobalVariables,
      ),
      [utilityStdLibName]: new UtilityStdLibModule(
        this.memory,
        this.functionTable,
        this.config,
        this.sharedWasmGlobalVariables,
      ),
      [soundLibraryModuleImportName]: new SoundLibraryModule(
        this.memory,
        this.functionTable,
        this.config,
        this.sharedWasmGlobalVariables,
      ),
      [plotlyLibraryModuleImportName]: new PlotlyLibraryModule(
        this.memory,
        this.functionTable,
        this.config,
        this.sharedWasmGlobalVariables,
      ),
    };
  }

  setStackPointerValue(value: number) {
    this.sharedWasmGlobalVariables.stackPointer.value = value;
  }

  setBasePointerValue(value: number) {
    this.sharedWasmGlobalVariables.basePointer.value = value;
  }

  setHeapPointerValue(value: number) {
    this.sharedWasmGlobalVariables.heapPointer.value = value;
  }

  setMemory(numberOfPages: number) {
    this.memory = new WebAssembly.Memory({ initial: numberOfPages });
  }

  /**
   * Returns the object that can be used as argument to Webassembly.instantiate.
   * @param importedModules the names of all modules that are being imported and used in a particular compiled wasm output file.
   */
  async createWasmImportsObject(
    importedModules: ModuleName[],
  ): Promise<WebAssembly.Imports> {
    const imports: WebAssembly.Imports = {
      js: {
        mem: this.memory,
        function_table: this.functionTable,
        sp: this.sharedWasmGlobalVariables.stackPointer,
        hp: this.sharedWasmGlobalVariables.heapPointer,
        bp: this.sharedWasmGlobalVariables.basePointer,
      },
    };

    for (const moduleName of importedModules) {
      const module = this.modules[moduleName];
      const moduleImportObject: WebAssembly.ModuleImports = {};
      if (typeof this.modules[moduleName].instantiate !== "undefined") {
        await (this.modules[moduleName].instantiate as () => Promise<void>)();
      }
      Object.keys(this.modules[moduleName].moduleFunctions).map(
        (moduleFunctionName) => {
          moduleImportObject[moduleFunctionName] =
            module.moduleFunctions[moduleFunctionName].jsFunction;
        },
      );
      imports[moduleName] = moduleImportObject;
    }
    return imports;
  }
}
