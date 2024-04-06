import { SIZE_T } from "~src/common/constants";
import { ModulesGlobalConfig, SharedWasmGlobalVariables } from "~src/modules";
import {
  freeFunction,
  mallocFunction,
  printHeap,
  printStack,
} from "~src/modules/source_stdlib/memory";
import { Module, ModuleFunction } from "~src/modules/types";
import {
  convertFloatToCStyleString,
  extractCStyleStringFromMemory,
} from "~src/modules/util";
import { StructDataType } from "~src/parser/c-ast/dataTypes";

// the name that this module is imported into wasm by,
// as well as the include name to use in C program file.
export const sourceStandardLibraryModuleImportName = "source_stdlib";

export class SourceStandardLibraryModule extends Module {
  moduleDeclaredStructs: StructDataType[];
  moduleFunctions: Record<string, ModuleFunction>;
  heapAddress: number; // address of first item in heap

  constructor(
    memory: WebAssembly.Memory,
    functionTable: WebAssembly.Table,
    config: ModulesGlobalConfig,
    sharedWasmGlobalVariables: SharedWasmGlobalVariables
  ) {
    super(memory, functionTable, config, sharedWasmGlobalVariables);
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
          returnType: { type: "void" },
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
          returnType: { type: "void" },
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
          returnType: { type: "void" },
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
          returnType: { type: "void" },
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
          returnType: { type: "void" },
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
          returnType: { type: "void" },
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
          returnType: { type: "void" },
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
              type: "pointer",
              pointeeType: { type: "void" },
            },
          ],
          returnType: { type: "void" },
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
                isConst: true
              },
            },
          ],
          returnType: { type: "void" },
        },
        jsFunction: (strAddress: number) => {
          const str = extractCStyleStringFromMemory(memory.buffer, strAddress);
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
            pointeeType: { type: "void" },
          },
        },
        jsFunction: (numBytes: number) =>
          mallocFunction({
            memory: this.memory,
            sharedWasmGlobalVariables: this.sharedWasmGlobalVariables,
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
              pointeeType: { type: "void" },
            },
          ],
          returnType: { type: "void" },
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
          returnType: { type: "void" },
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
          returnType: { type: "void" },
        },
        jsFunction: () =>
          printStack(
            this.memory,
            this.sharedWasmGlobalVariables.stackPointer.value
          ),
      },
      // only works in browser environment, node.js support can be added in future
      prompt_int: {
        parentImportedObject: sourceStandardLibraryModuleImportName,
        functionType: {
          type: "function",
          parameters: [
          ],
          returnType: { type: "primary", primaryDataType: "signed int" },
        },
        jsFunction: () => prompt("Enter a signed integer"),
      },
      prompt_long: {
        parentImportedObject: sourceStandardLibraryModuleImportName,
        functionType: {
          type: "function",
          parameters: [
          ],
          returnType: { type: "primary", primaryDataType: "signed long" },
        },
        jsFunction: () => prompt("Enter a long signed integer"),
      },
      // only works in browser environment, node.js support can be added in future
      prompt_float: {
        parentImportedObject: sourceStandardLibraryModuleImportName,
        functionType: {
          type: "function",
          parameters: [
          ],
          returnType: { type: "primary", primaryDataType: "float" },
        },
        jsFunction: () => prompt("Enter a float"),
      },
      prompt_double: {
        parentImportedObject: sourceStandardLibraryModuleImportName,
        functionType: {
          type: "function",
          parameters: [
          ],
          returnType: { type: "primary", primaryDataType: "double" },
        },
        jsFunction: () => prompt("Enter a double"),
      },
      // only works in browser environment, node.js support can be added in future
      prompt_string: {
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
          returnType: {type: "void"},
        },
        jsFunction: (strAddr: number) => {
          const str = prompt("Enter a string");
          const encoder = new TextEncoder();
          const strBuffer = new Uint8Array(this.memory.buffer, strAddr);
          if (str === null) {
            strBuffer[0] = 0;
            return;
          }
          const buf = encoder.encode(str);
          for (let i = 0; i < str.length; ++i) {
            strBuffer[i] = buf[i];
          }
          strBuffer[str.length] = 0;
        },
      },
      // EXAMPLE of how to have a function taking aggregate type and returning aggreate type - TESTED AND WORKING
      // adjust_a: {
      //   parentImportedObject: sourceStandardLibraryModuleImportName,
      //   functionType: {
      //     type: "function",
      //     parameters: [
      //       {
      //         type: "primary",
      //         primaryDataType: "signed int"
      //       },
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
      //       {
      //         type: "primary",
      //         primaryDataType: "signed char"
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
      //   jsFunction: (a: number, i: number, c: number, l: bigint, z: number) => [
      //     i + a,
      //     c + 1,
      //     l + BigInt(z),
      //   ],
      // },
    };
  }
}
