import { ModulesGlobalConfig, SharedWasmGlobalVariables } from "~src/modules";
import { Module, ModuleFunction } from "~src/modules/types";
import { extractCStyleStringFromMemory, getExternalFunction } from "~src/modules/util";
import { StructDataType } from "~src/parser/c-ast/dataTypes";

// the name that this module is imported into wasm by,
// as well as the include name to use in C program file.
export const pixAndFlixLibraryModuleImportName = "pix_n_flix";

export class PixAndFlixLibrary extends Module {
  moduleDeclaredStructs: StructDataType[];
  moduleFunctions: Record<string, ModuleFunction>;
  sharedWasmGlobalVariables: SharedWasmGlobalVariables;

  constructor(
    memory: WebAssembly.Memory,
    config: ModulesGlobalConfig,
    sharedWasmGlobalVariables: SharedWasmGlobalVariables
  ) {
    super(memory, config);
    this.sharedWasmGlobalVariables = sharedWasmGlobalVariables;
    this.moduleDeclaredStructs = [];
    this.moduleFunctions = {
      use_image_url: {
        parentImportedObject: pixAndFlixLibraryModuleImportName,
        functionType: {
          type: "function",
          parameters: [
            {
              type: "pointer",
              pointeeType: {
                type: "primary",
                primaryDataType: "signed char",
              },
            },
          ],
          returnType: null,
        },
        jsFunction: (strAddress: number) => {
          const url = extractCStyleStringFromMemory(memory.buffer, strAddress);
          getExternalFunction("use_image_url", config)(url);
        },
      },
      // prints an unsigned int (4 bytes and smaller)
      start: {
        parentImportedObject: pixAndFlixLibraryModuleImportName,
        functionType: {
          type: "function",
          parameters: [],
          returnType: null,
        },
        jsFunction: () => {
          getExternalFunction("start", config)();
        },
      },
    };
  }
}
