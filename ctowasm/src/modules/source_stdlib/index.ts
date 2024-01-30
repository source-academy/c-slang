import { ModulesGlobalConfig } from "~src/modules";
import { Module, ModuleFunction } from "~src/modules/types";
import { convertFloatToCStyleString } from "~src/modules/util";

// the name that this module is imported into wasm by, 
// as well as the include name to use in C program file.
export const sourceStandardLibraryModuleImportName = "source_stdlib";

export class SourceStandardLibraryModule extends Module {
  moduleFunctions: Record<string, ModuleFunction>;
  
  constructor(memory: WebAssembly.Memory, config: ModulesGlobalConfig) {
    super(memory, config);
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
        jsFunction: (float: number) => this.print(convertFloatToCStyleString(float)),
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
        jsFunction: (float: number) => this.print(convertFloatToCStyleString(float)),
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
    }
  }
}
  