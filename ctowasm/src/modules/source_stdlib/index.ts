import { SIZE_T } from "~src/common/constants";
import { ModulesGlobalConfig, SharedWasmGlobalVariables } from "~src/modules";
import {
  MemoryBlock,
  freeFunction,
  mallocFunction,
  printHeap,
  printStack,
} from "~src/modules/source_stdlib/memory";
import { Module, ModuleFunction } from "~src/modules/types";
import { convertFloatToCStyleString } from "~src/modules/util";
import { DataType, StructDataType } from "~src/parser/c-ast/dataTypes";

// the name that this module is imported into wasm by,
// as well as the include name to use in C program file.
export const sourceStandardLibraryModuleImportName = "source_stdlib";

export class SourceStandardLibraryModule extends Module {
  moduleDeclaredStructs: StructDataType[];
  moduleFunctions: Record<string, ModuleFunction>;
  sharedWasmGlobalVariables: SharedWasmGlobalVariables;
  heapAddress: number; // address of first item in heap
  // freeList used for malloc
  freeList: MemoryBlock[] = [];
  allocatedBlocks: Map<number, number> = new Map(); // allocated memory blocks <address, size>

  constructor(
    memory: WebAssembly.Memory,
    config: ModulesGlobalConfig,
    sharedWasmGlobalVariables: SharedWasmGlobalVariables
  ) {
    super(memory, config);
    this.sharedWasmGlobalVariables = sharedWasmGlobalVariables;
    this.heapAddress = this.sharedWasmGlobalVariables.heapPointer.value;
    this.moduleDeclaredStructs = [];
    this.moduleFunctions = {
      print_int: {
        parentImportedObject: sourceStandardLibraryModuleImportName,
        functionType: {
          type: "function",
          parameters: [
            {
              type: "primary",
              primaryDataType: "signed int",
            },
          ],
          returnType: null,
        },
        jsFunction: (int: number) => {
          // to print the correct int (4 bytes), need to handle signage
          if (int > Math.pow(2, 32) - 1) {
            // negative number
            this.print((-int).toString());
          } else {
            this.print(int.toString());
          }
        },
      },
      // prints an unsigned int (4 bytes and smaller)
      print_int_unsigned: {
        parentImportedObject: sourceStandardLibraryModuleImportName,
        functionType: {
          type: "function",
          parameters: [
            {
              type: "primary",
              primaryDataType: "unsigned int",
            },
          ],
          returnType: null,
        },
        jsFunction: (val: number) => {
          // need to intepret val as unsigned 4 byte int
          if (val < 0) {
            this.print((val + Math.pow(2, 32)).toString());
          } else {
            this.print(val.toString());
          }
        },
      },
      // prints a char (signed) as a character
      print_char: {
        parentImportedObject: sourceStandardLibraryModuleImportName,
        functionType: {
          type: "function",
          parameters: [
            {
              type: "primary",
              primaryDataType: "signed char",
            },
          ],
          returnType: null,
        },
        jsFunction: (char: number) => {
          // signed int overflow is undefined, no need to worry about handling that
          this.print(String.fromCharCode(char));
        },
      },
      // print a signed long type (8 bytes)
      print_long: {
        parentImportedObject: sourceStandardLibraryModuleImportName,
        functionType: {
          type: "function",
          parameters: [
            {
              type: "primary",
              primaryDataType: "signed long",
            },
          ],
          returnType: null,
        },
        jsFunction: (long: bigint) => {
          // to prlong the correct long (4 bytes), need to handle signage
          if (long > 2n ** 64n - 1n) {
            // negative number
            this.print((-long).toString());
          } else {
            this.print(long.toString());
          }
        },
      },
      // print an usigned long type (8 bytes)
      print_long_unsigned: {
        parentImportedObject: sourceStandardLibraryModuleImportName,
        functionType: {
          type: "function",
          parameters: [
            {
              type: "primary",
              primaryDataType: "unsigned long",
            },
          ],
          returnType: null,
        },
        jsFunction: (val: bigint) => {
          // need to intepret val as unsigned 8 byte unsigned int
          if (val < 0) {
            this.print((val + 2n ** 64n).toString());
          } else {
            this.print(val.toString());
          }
        },
      },
      print_float: {
        parentImportedObject: sourceStandardLibraryModuleImportName,
        functionType: {
          type: "function",
          parameters: [
            {
              type: "primary",
              primaryDataType: "float",
            },
          ],
          returnType: null,
        },
        jsFunction: (float: number) =>
          this.print(convertFloatToCStyleString(float)),
      },
      print_double: {
        parentImportedObject: sourceStandardLibraryModuleImportName,
        functionType: {
          type: "function",
          parameters: [
            {
              type: "primary",
              primaryDataType: "double",
            },
          ],
          returnType: null,
        },
        jsFunction: (float: number) =>
          this.print(convertFloatToCStyleString(float)),
      },
      // for printing the value of pointers. behaves the same as print_int_unsigned
      print_address: {
        parentImportedObject: sourceStandardLibraryModuleImportName,
        functionType: {
          type: "function",
          parameters: [
            {
              type: "primary",
              primaryDataType: "unsigned int",
            },
          ],
          returnType: null,
        },
        jsFunction: (val: number) => {
          // need to intepret val as unsigned 4 byte int
          if (val < 0) {
            this.print((val + Math.pow(2, 32)).toString());
          } else {
            this.print(val.toString());
          }
        },
      },
      // print a C style string
      print_string: {
        parentImportedObject: sourceStandardLibraryModuleImportName,
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
          // need to intepret val as unsigned 4 byte int
          const uInt8Arr = new Uint8Array(memory.buffer);
          let str = "";
          let i = strAddress;
          while (uInt8Arr[i] !== 0) {
            // keep recording chars until null terminator
            str += String.fromCharCode(uInt8Arr[i++]);
          }
          this.print(str);
        },
      },
      malloc: {
        parentImportedObject: sourceStandardLibraryModuleImportName,
        functionType: {
          type: "function",
          parameters: [
            {
              type: "primary",
              primaryDataType: SIZE_T,
            },
          ],
          returnType: {
            type: "pointer",
            pointeeType: null,
          },
        },
        jsFunction: (numBytes: number) =>
          mallocFunction({
            memory: this.memory,
            memoryPointers: this.sharedWasmGlobalVariables,
            freeList: this.freeList,
            allocatedBlocks: this.allocatedBlocks,
            bytesRequested: numBytes,
          }),
      },
      free: {
        parentImportedObject: sourceStandardLibraryModuleImportName,
        functionType: {
          type: "function",
          parameters: [
            {
              type: "pointer",
              pointeeType: null,
            },
          ],
          returnType: null,
        },
        jsFunction: (address: number) =>
          freeFunction({
            address,
            freeList: this.freeList,
            allocatedBlocks: this.allocatedBlocks,
          }),
      },
      print_heap: {
        parentImportedObject: sourceStandardLibraryModuleImportName,
        functionType: {
          type: "function",
          parameters: [],
          returnType: null,
        },
        jsFunction: () =>
          printHeap(
            this.memory,
            this.heapAddress,
            this.sharedWasmGlobalVariables.heapPointer.value
          ),
      },
      print_stack: {
        parentImportedObject: sourceStandardLibraryModuleImportName,
        functionType: {
          type: "function",
          parameters: [],
          returnType: null,
        },
        jsFunction: () =>
          printStack(
            this.memory,
            this.sharedWasmGlobalVariables.stackPointer.value
          ),
      },
      // EXAMPLE of how to have a function taking aggregate type and returning aggreate type - TESTED AND WORKING
      // adjust_a: {
      //   parentImportedObject: sourceStandardLibraryModuleImportName,
      //   functionType: {
      //     type: "function",
      //     parameters: [
      //       {
      //         type: "struct",
      //         tag: "A",
      //         fields: [
      //           {
      //             tag: "i",
      //             dataType: {
      //               type: "primary",
      //               primaryDataType: "signed int",
      //             },
      //           },
      //           {
      //             tag: "c",
      //             dataType: {
      //               type: "primary",
      //               primaryDataType: "signed char",
      //             },
      //           },
      //           {
      //             tag: "l",
      //             dataType: {
      //               type: "primary",
      //               primaryDataType: "signed long",
      //             },
      //           },
      //         ],
      //       },
      //     ],
      //     returnType: {
      //       type: "struct",
      //       tag: "A",
      //       fields: [
      //         {
      //           tag: "i",
      //           dataType: {
      //             type: "primary",
      //             primaryDataType: "signed int",
      //           },
      //         },
      //         {
      //           tag: "c",
      //           dataType: {
      //             type: "primary",
      //             primaryDataType: "signed char",
      //           },
      //         },
      //         {
      //           tag: "l",
      //           dataType: {
      //             type: "primary",
      //             primaryDataType: "signed long",
      //           },
      //         },
      //       ],
      //     },
      //   },
      //   jsFunction: (i: number, c: number, l: bigint) => [
      //     i + 10,
      //     c + 1,
      //     l + 100n,
      //   ],
      // },
    };
  }
}
