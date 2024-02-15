import { ModulesGlobalConfig, SharedWasmGlobalVariables } from "~src/modules";
import { mallocFunction } from "~src/modules/source_stdlib/memory";
import { Module, ModuleFunction } from "~src/modules/types";
import {
  extractCStyleStringFromMemory,
  getExternalFunction,
} from "~src/modules/util";
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
    functionTable: WebAssembly.Table,
    config: ModulesGlobalConfig,
    sharedWasmGlobalVariables: SharedWasmGlobalVariables
  ) {
    super(memory, functionTable, config, sharedWasmGlobalVariables);
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
      image_height: {
        parentImportedObject: pixAndFlixLibraryModuleImportName,
        functionType: {
          type: "function",
          parameters: [],
          returnType: {
            type: "primary",
            primaryDataType: "signed int",
          },
        },
        jsFunction: () => {
          getExternalFunction("image_height", config)();
        },
      },
      image_width: {
        parentImportedObject: pixAndFlixLibraryModuleImportName,
        functionType: {
          type: "function",
          parameters: [],
          returnType: {
            type: "primary",
            primaryDataType: "signed int",
          },
        },
        jsFunction: () => {
          getExternalFunction("image_width", config)();
        },
      },
      set_dimensions: {
        parentImportedObject: pixAndFlixLibraryModuleImportName,
        functionType: {
          type: "function",
          parameters: [
            {
              type: "primary",
              primaryDataType: "signed int",
            },
            {
              type: "primary",
              primaryDataType: "signed int",
            },
          ],
          returnType: null,
        },
        jsFunction: (width: number, height: number) => {
          getExternalFunction("set_dimensions", config)(width, height);
        },
      },
      install_filter: {
        parentImportedObject: pixAndFlixLibraryModuleImportName,
        functionType: {
          type: "function",
          parameters: [
            {
              type: "pointer",
              pointeeType: {
                type: "pointer",
                pointeeType: {
                  type: "array",
                  elementDataType: {
                    type: "primary",
                    primaryDataType: "signed char",
                  },
                  numElements: {
                    type: "IntegerConstant",
                    value: 3n,
                    suffix: null,
                    position: {
                      start: { line: 0, offset: 0, column: 0 },
                      end: { line: 0, offset: 0, column: 0 },
                    },
                  },
                },
              },
            },
            {
              type: "pointer",
              pointeeType: {
                type: "pointer",
                pointeeType: {
                  type: "array",
                  elementDataType: {
                    type: "primary",
                    primaryDataType: "signed char",
                  },
                  numElements: {
                    type: "IntegerConstant",
                    value: 3n,
                    suffix: null,
                    position: {
                      start: { line: 0, offset: 0, column: 0 },
                      end: { line: 0, offset: 0, column: 0 },
                    },
                  },
                },
              },
            },
          ],
          returnType: null,
        },
        jsFunction: (funcPtr: number) => {
          const filter = (src: number[][][], dest: number[][][]) => {
            const memNeeded = src.length * src[0].length * src[0][0].length;
            const address = mallocFunction({
              memory,
              memoryPointers: sharedWasmGlobalVariables,
              freeList: this.freeList,
              allocatedBlocks: this.allocatedBlocks,
              bytesRequested: memNeeded
            })
            
          }
          getExternalFunction("install_filter", config)();
        },
      },
    };
  }
}
