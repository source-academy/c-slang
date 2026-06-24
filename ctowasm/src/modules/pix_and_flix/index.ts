import { ModulesGlobalConfig, SharedWasmGlobalVariables } from "~src/modules";
import { voidDataType } from "~src/modules/constants";
import {
  freeFunction,
  mallocFunction,
} from "~src/modules/source_stdlib/memory";
import wrapFunctionPtrCall from "~src/modules/stackFrameUtils";
import { Module, ModuleFunction, StackFrameArg } from "~src/modules/types";
import {
  extractCStyleStringFromMemory,
  getExternalFunction,
} from "~src/modules/util";
import { StructDataType } from "~src/parser/c-ast/dataTypes";
import { addCustomJsFunctionToTable } from "~src/modules/jsFunctionUtils";

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
    sharedWasmGlobalVariables: SharedWasmGlobalVariables,
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
          returnType: voidDataType,
        },
        jsFunction: (strAddress: number) => {
          const url = extractCStyleStringFromMemory(memory.buffer, strAddress);
          getExternalFunction("use_image_url", config)(url);
        },
      },
      use_video_url: {
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
          returnType: voidDataType,
        },
        jsFunction: (strAddress: number) => {
          const url = extractCStyleStringFromMemory(memory.buffer, strAddress);
          getExternalFunction("use_video_url", config)(url);
        },
      },
      // prints an unsigned int (4 bytes and smaller)
      start: {
        parentImportedObject: pixAndFlixLibraryModuleImportName,
        functionType: {
          type: "function",
          parameters: [],
          returnType: voidDataType,
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
        jsFunction: () => getExternalFunction("image_height", config)(),
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
        jsFunction: () => getExternalFunction("image_width", config)(),
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
          returnType: voidDataType,
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
                      type: "array",
                      elementDataType: {
                        type: "array",
                        elementDataType: {
                          type: "primary",
                          primaryDataType: "signed char",
                        },
                        numElements: {
                          type: "IntegerConstant",
                          value: 4n,
                          suffix: null,
                          position: {
                            start: { line: 0, offset: 0, column: 0 },
                            end: { line: 0, offset: 0, column: 0 },
                          },
                        },
                      },
                      numElements: {
                        type: "IntegerConstant",
                        value: 400n,
                        suffix: null,
                        position: {
                          start: { line: 0, offset: 0, column: 0 },
                          end: { line: 0, offset: 0, column: 0 },
                        },
                      },
                    },
                  },
                  {
                    type: "pointer",
                    pointeeType: {
                      type: "array",
                      elementDataType: {
                        type: "array",
                        elementDataType: {
                          type: "primary",
                          primaryDataType: "signed char",
                        },
                        numElements: {
                          type: "IntegerConstant",
                          value: 4n,
                          suffix: null,
                          position: {
                            start: { line: 0, offset: 0, column: 0 },
                            end: { line: 0, offset: 0, column: 0 },
                          },
                        },
                      },
                      numElements: {
                        type: "IntegerConstant",
                        value: 400n,
                        suffix: null,
                        position: {
                          start: { line: 0, offset: 0, column: 0 },
                          end: { line: 0, offset: 0, column: 0 },
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
                returnType: voidDataType,
              },
            },
          ],
          returnType: voidDataType,
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
            let currAddress = 0;
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
                value: BigInt(srcAddress),
                type: "unsigned int",
              },
              {
                value: BigInt(destAddress),
                type: "unsigned int",
              },
              {
                value: BigInt(src.length),
                type: "unsigned int",
              },
              {
                value: BigInt(src[0].length),
                type: "unsigned int",
              },
            ];

            // call the function pointer
            wrapFunctionPtrCall(
              memory,
              functionTable,
              funcPtr,
              sharedWasmGlobalVariables,
              stackFrameArgs,
              [],
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
      reset_filter: {
        parentImportedObject: pixAndFlixLibraryModuleImportName,
        functionType: {
          type: "function",
          parameters: [],
          returnType: voidDataType,
        },
        jsFunction: () => {
          getExternalFunction("reset_filter", config)();
        },
      },
      set_fps: {
        parentImportedObject: pixAndFlixLibraryModuleImportName,
        functionType: {
          type: "function",
          parameters: [
            {
              type: "primary",
              primaryDataType: "signed int",
            },
          ],
          returnType: voidDataType,
        },
        jsFunction: () => {
          getExternalFunction("set_fps", config)();
        },
      },
      compose_filter: {
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
                      type: "array",
                      elementDataType: {
                        type: "array",
                        elementDataType: {
                          type: "primary",
                          primaryDataType: "signed char",
                        },
                        numElements: {
                          type: "IntegerConstant",
                          value: 4n,
                          suffix: null,
                          position: {
                            start: { line: 0, offset: 0, column: 0 },
                            end: { line: 0, offset: 0, column: 0 },
                          },
                        },
                      },
                      numElements: {
                        type: "IntegerConstant",
                          value: 400n,
                          suffix: null,
                          position: {
                            start: { line: 0, offset: 0, column: 0 },
                            end: { line: 0, offset: 0, column: 0 },
                          },
                      },
                    },
                  },
                  {
                    type: "pointer",
                    pointeeType: {
                      type: "array",
                      elementDataType: {
                        type: "array",
                        elementDataType: {
                          type: "primary",
                          primaryDataType: "signed char",
                        },
                        numElements: {
                          type: "IntegerConstant",
                          value: 4n,
                          suffix: null,
                          position: {
                            start: { line: 0, offset: 0, column: 0 },
                            end: { line: 0, offset: 0, column: 0 },
                          },
                        },
                      },
                      numElements: {
                        type: "IntegerConstant",
                        value: 400n,
                        suffix: null,
                        position: {
                          start: { line: 0, offset: 0, column: 0 },
                          end: { line: 0, offset: 0, column: 0 },
                        },
                      },
                    },
                  },
                  {
                    type: "primary",
                    primaryDataType: "signed int",
                  },
                  {
                    type: "primary",
                    primaryDataType: "signed int",
                  },
                ],
                returnType: voidDataType,
              },
            },
            {
              type: "pointer",
              pointeeType: {
                type: "function",
                parameters: [
                  {
                    type: "pointer",
                    pointeeType: {
                      type: "array",
                      elementDataType: {
                        type: "array",
                        elementDataType: {
                          type: "primary",
                          primaryDataType: "signed char",
                        },
                        numElements: {
                          type: "IntegerConstant",
                          value: 4n,
                          suffix: null,
                          position: {
                            start: { line: 0, offset: 0, column: 0 },
                            end: { line: 0, offset: 0, column: 0 },
                          },
                        },
                      },
                      numElements: {
                        type: "IntegerConstant",
                        value: 400n,
                        suffix: null,
                        position: {
                          start: { line: 0, offset: 0, column: 0 },
                          end: { line: 0, offset: 0, column: 0 },
                        },
                      },
                    },
                  },
                  {
                    type: "pointer",
                    pointeeType: {
                      type: "array",
                      elementDataType: {
                        type: "array",
                        elementDataType: {
                          type: "primary",
                          primaryDataType: "signed char",
                        },
                        numElements: {
                          type: "IntegerConstant",
                          value: 4n,
                          suffix: null,
                          position: {
                            start: { line: 0, offset: 0, column: 0 },
                            end: { line: 0, offset: 0, column: 0 },
                          },
                        },
                      },
                      numElements: {
                        type: "IntegerConstant",
                        value: 400n,
                        suffix: null,
                        position: {
                          start: { line: 0, offset: 0, column: 0 },
                          end: { line: 0, offset: 0, column: 0 },
                        },
                      },
                    },
                  },
                  {
                    type: "primary",
                    primaryDataType: "signed int",
                  },
                  {
                    type: "primary",
                    primaryDataType: "signed int",
                  },
                ],
                returnType: voidDataType,
              },
            },
          ],
          returnType: {
            type: "pointer",
            pointeeType: {
              type: "function",
              parameters: [
                {
                  type: "pointer",
                  pointeeType: {
                    type: "array",
                    elementDataType: {
                      type: "array",
                      elementDataType: {
                        type: "primary",
                        primaryDataType: "signed char",
                      },
                      numElements: {
                        type: "IntegerConstant",
                        value: 4n,
                        suffix: null,
                        position: {
                          start: { line: 0, offset: 0, column: 0 },
                          end: { line: 0, offset: 0, column: 0 },
                        },
                      },
                    },
                    numElements: {
                      type: "IntegerConstant",
                      value: 400n,
                      suffix: null,
                      position: {
                        start: { line: 0, offset: 0, column: 0 },
                        end: { line: 0, offset: 0, column: 0 },
                      },
                    },
                  },
                },
                {
                  type: "pointer",
                  pointeeType: {
                    type: "array",
                    elementDataType: {
                      type: "array",
                      elementDataType: {
                        type: "primary",
                        primaryDataType: "signed char",
                      },
                      numElements: {
                        type: "IntegerConstant",
                        value: 4n,
                        suffix: null,
                        position: {
                          start: { line: 0, offset: 0, column: 0 },
                          end: { line: 0, offset: 0, column: 0 },
                        },
                      },
                    },
                    numElements: {
                      type: "IntegerConstant",
                      value: 400n,
                      suffix: null,
                      position: {
                        start: { line: 0, offset: 0, column: 0 },
                        end: { line: 0, offset: 0, column: 0 },
                      },
                    },
                  },
                },
                {
                  type: "primary",
                  primaryDataType: "signed int",
                },
                {
                  type: "primary",
                  primaryDataType: "signed int",
                },
              ],
              returnType: voidDataType,
            },
          },
        },
        jsFunction: (filter1: number, filter2: number) => {
          const composedFilterFunction = (srcPtr: number, destPtr: number, height: number, width: number) => {
            const memSize = height * width * 4;
            
            const intermediatePtr = mallocFunction({
              memory,
              sharedWasmGlobalVariables,
              freeList: this.freeList,
              allocatedBlocks: this.allocatedBlocks,
              bytesRequested: memSize,
            });
            
            const intermediateBuf = new Uint8Array(memory.buffer, intermediatePtr, memSize);
            intermediateBuf.fill(0);
                
            const args1: StackFrameArg[] = [
              { value: BigInt(srcPtr), type: "unsigned int" },
              { value: BigInt(intermediatePtr), type: "unsigned int" },
              { value: BigInt(height), type: "unsigned int" },
              { value: BigInt(width), type: "unsigned int" }
            ];
            
            wrapFunctionPtrCall(
              memory,
              functionTable,
              filter1,
              sharedWasmGlobalVariables,
              args1,
              []
            );
            
            const args2: StackFrameArg[] = [
              { value: BigInt(intermediatePtr), type: "unsigned int" },
              { value: BigInt(destPtr), type: "unsigned int" },
              { value: BigInt(height), type: "unsigned int" },
              { value: BigInt(width), type: "unsigned int" }
            ];
            
            wrapFunctionPtrCall(
              memory,
              functionTable,
              filter2,
              sharedWasmGlobalVariables,
              args2,
              []
            );

            freeFunction({
              address: intermediatePtr,
              freeList: this.freeList,
              allocatedBlocks: this.allocatedBlocks,
            });
          }
          
          const composedFuncPtr = addCustomJsFunctionToTable(
            composedFilterFunction,
            ["i32", "i32", "i32", "i32"], 
            null,
            functionTable,
            memory,
            sharedWasmGlobalVariables
          );

          return composedFuncPtr;
        }
      },
    };
  }
}
