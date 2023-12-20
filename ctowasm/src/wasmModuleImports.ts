/**
 *  Definitions of all special functions imported to every wasm program
 */

import { VariableType } from "~src/common/types";

import { WasmStatement } from "~src/wasm-ast/core";
import { WasmType } from "~src/wasm-ast/types";

const defaultParentImportedObject = "imports";

// Defines the signature of a wasm imported function
export interface ImportedFunction {
  type: "original" | "modified"; // two variants - original means imported function is used as is, modified means there is another function definition in the wasm module that calls this imported function
  parentImportedObject: string; // parent imported object
  name: string; // function name
  params: VariableType[]; // C types of parameters for the function
  return: VariableType | null;
  jsFunction: Function; // the actual JS function that is called
}

export interface WasmOriginalImportedFunction extends ImportedFunction {
  type: "original";
}

// default print to stdout is to console.log
let print = (str: string) => console.log(str);

// set the print function to use for printing to stdout
export function setPrintFunction(printFunc: (str: string) => void) {
  print = printFunc;
}

export const wasmModuleImports: Record<string, WasmOriginalImportedFunction> = {
  // prints a signed int (4 bytes and smaller)
  print_int: {
    type: "original",
    parentImportedObject: defaultParentImportedObject,
    name: "print_int",
    params: ["signed int"], // i32 here is a the address of the int to print
    return: null,
    jsFunction: (int: number) => {
      // to print the correct int (4 bytes), need to handle signage
      if (int > Math.pow(2, 32) - 1) {
        // negative number
        print((-int).toString());
      } else {
        print(int.toString());
      }
    },
  },
  // prints an unsigned int (4 bytes and smaller)
  print_int_unsigned: {
    type: "original",
    parentImportedObject: defaultParentImportedObject,
    name: "print_int_unsigned",
    params: ["unsigned int"], // i32 here is a the address of the int to print
    return: null,
    jsFunction: (val: number) => {
      // need to intepret val as unsigned 4 byte int
      if (val < 0) {
        print((val + Math.pow(2, 32)).toString());
      } else {
        print(val.toString());
      }
    },
  },
  // prints a char (signed) as a character
  print_char: {
    type: "original",
    parentImportedObject: defaultParentImportedObject,
    name: "print_char",
    params: ["signed char"], // i32 here is a the address of the char to print
    return: null,
    jsFunction: (char: number) => {
      // signed int overflow is undefined, no need to worry about handling that
      print(String.fromCharCode(char));
    },
  },
  // print a signed long type (8 bytes)
  print_long: {
    type: "original",
    parentImportedObject: defaultParentImportedObject,
    name: "print_long",
    params: ["signed long"], // i32 here is a the address of the int to print
    return: null,
    jsFunction: (long: bigint) => {
      // to prlong the correct long (4 bytes), need to handle signage
      if (long > 2n ** 64n - 1n) {
        // negative number
        print((-long).toString());
      } else {
        print(long.toString());
      }
    },
  },
  // print an usigned long type (8 bytes)
  print_long_unsigned: {
    type: "original",
    parentImportedObject: defaultParentImportedObject,
    name: "print_long_unsigned",
    params: ["unsigned long"], // i32 here is a the address of the int to print
    return: null,
    jsFunction: (val: bigint) => {
      // need to intepret val as unsigned 8 byte unsigned int
      if (val < 0) {
        print((val + 2n ** 64n).toString());
      } else {
        print(val.toString());
      }
    },
  },
};

export default wasmModuleImports;
