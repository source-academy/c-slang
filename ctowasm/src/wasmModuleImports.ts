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
}

export interface WasmOriginalImportedFunction extends ImportedFunction {
  type: "original";
}

export interface WasmModifiedImportedFunction extends ImportedFunction {
  type: "modified";
  modifiedParams: WasmType[]; // adjusted params of actual function
  modifiedReturn: WasmType | null;
  body: WasmStatement[]; // all the lines of body of this modified function
}

const wasmModuleImports: Record<
  string,
  WasmOriginalImportedFunction | WasmModifiedImportedFunction
> = {
  // prints a signed int (4 bytes and smaller)
  print_int: {
    type: "original",
    parentImportedObject: defaultParentImportedObject,
    name: "print_int",
    params: ["signed int"], // i32 here is a the address of the int to print
    return: null,
  },
  // prints an unsigned int (4 bytes and smaller)
  print_int_unsigned: {
    type: "original",
    parentImportedObject: defaultParentImportedObject,
    name: "print_int_unsigned",
    params: ["unsigned int"], // i32 here is a the address of the int to print
    return: null,
  },
  // prints a char (signed) as a character
  print_char: {
    type: "original",
    parentImportedObject: defaultParentImportedObject,
    name: "print_char",
    params: ["signed char"], // i32 here is a the address of the char to print
    return: null,
  },
};

export default wasmModuleImports;
