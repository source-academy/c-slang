import { ModulesGlobalConfig, SharedWasmGlobalVariables } from "~src/modules";
import {
  freeFunction,
  mallocFunction,
} from "~src/modules/source_stdlib/memory";
import { Module, ModuleFunction } from "~src/modules/types";
import {
  StackFrameArg,
  extractCStyleStringFromMemory,
  getExternalFunction,
  loadStackFrame,
  tearDownStackFrame,
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
              type: "primary", // height of image
              primaryDataType: "signed int",
            },
            {
              type: "primary", // width of image
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
                  {
                    type: "primary", // height of image
                    primaryDataType: "signed int",
                  },
                  {
                    type: "primary", // width of image
                    primaryDataType: "signed int",
                  },
                ],
                returnType: null,
              },
            },
          ],
          returnType: null,
        },
        jsFunction: (funcPtr: number) => {
          const filter = (src: number[][][], dest: number[][][]) => {
            const memSize = src.length * src[0].length * src[0][0].length;
            // allocate buffers on the heap
            const srcAddress = mallocFunction({
              memory,
              sharedWasmGlobalVariables,
              freeList: this.freeList,
              allocatedBlocks: this.allocatedBlocks,
              bytesRequested: memSize,
            });
            const destAddress = mallocFunction({
              memory,
              sharedWasmGlobalVariables,
              freeList: this.freeList,
              allocatedBlocks: this.allocatedBlocks,
              bytesRequested: memSize,
            });

            // copy the values in
            let currAddress = srcAddress;
            const srcArr = new Uint8Array(memory.buffer, srcAddress, memSize);
            for (let i = 0; i < src.length; ++i) {
              for (let j = 0; j < src[0].length; ++j) {
                for (let k = 0; k < src[0][0].length; ++k) {
                  srcArr[currAddress++] = src[i][j][k];
                }
              }
            }

            const stackFrameArgs: StackFrameArg[] = [
              {
                value: srcAddress,
                size: 4,
                isSigned: false,
              },
              {
                value: destAddress,
                size: 4,
                isSigned: false,
              },
              {
                value: src.length,
                size: 4,
                isSigned: false,
              },
              {
                value: src[0].length,
                size: 4,
                isSigned: false,
              },
            ];

            // load arguments for the funcPtr into memory at places they should be
            const stackFrameSize = loadStackFrame(
              memory,
              sharedWasmGlobalVariables,
              stackFrameArgs,
              0
            );
            this.functionTable.get(funcPtr)();
            tearDownStackFrame(
              memory,
              stackFrameSize,
              sharedWasmGlobalVariables.stackPointer,
              sharedWasmGlobalVariables.basePointer
            );

            // copy the values out
            const destArr = new Uint8Array(memory.buffer, destAddress, memSize);
            currAddress = 0;
            for (let i = 0; i < dest.length; ++i) {
              for (let j = 0; j < dest[0].length; ++j) {
                for (let k = 0; k < dest[0][0].length; ++k) {
                  dest[i][j][k] = destArr[currAddress++];
                }
              }
            }

            // free both buffers
            freeFunction({
              address: srcAddress,
              freeList: this.freeList,
              allocatedBlocks: this.allocatedBlocks,
            });
            freeFunction({
              address: destAddress,
              freeList: this.freeList,
              allocatedBlocks: this.allocatedBlocks,
            });
          };
          getExternalFunction("install_filter", config)(filter);
        },
      },
    };
  }
}
