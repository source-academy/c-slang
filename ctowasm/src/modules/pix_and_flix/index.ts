import { ModulesGlobalConfig, SharedWasmGlobalVariables } from "~src/modules";
import { Module, ModuleFunction } from "~src/modules/types";
import { extractCStyleStringFromMemory } from "~src/modules/util";
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
          if (
            !config.externalLibraries ||
            !config.externalLibraries.pixAndFlix
          ) {
            throw new Error("Pix and flix functions not provided to compiler");
          }
          const url = extractCStyleStringFromMemory(memory.buffer, strAddress);
          config.externalLibraries.pixAndFlix.use_image_url(url);
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
          if (
            !config.externalLibraries ||
            !config.externalLibraries.pixAndFlix
          ) {
            throw new Error("Pix and flix functions not provided to compiler");
          }
          config.externalLibraries.pixAndFlix.start();
        },
      },
    };
  }
}
