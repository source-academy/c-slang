/**
 *  Definitions of all special functions imported to every wasm program
 */

import {
  BASE_POINTER,
  WASM_ADDR_SIZE,
  basePointerGetNode,
  getPointerArithmeticNode,
} from "~src/translator/memoryUtil";
import { wasmTypeToSize } from "~src/translator/util";
import { WasmExpression, WasmStatement } from "~src/wasm-ast/core";
import { WasmRegularFunctionCall } from "~src/wasm-ast/functions";
import { MemoryVariableByteSize } from "~src/wasm-ast/memory";
import { WasmType } from "~src/wasm-ast/types";

const defaultParentImportedObject = "imports";

// Defines the signature of a wasm imported function
export interface WasmImportedFunction {
  type: "original" | "modified"; // two variants - original means imported function is used as is, modified means there is another function definition in the wasm module that calls this imported function
  parentImportedObject: string; // parent imported object
  importedName: string; // name that the function is imported as. Should be "${name}_o"
  name: string; // function name
  params: WasmType[];
  return: WasmType | null;
  body: WasmStatement[]; // all the lines of body of this modified function
}

/**
 * Add a prefix to the original imported function name, so that the modified function
 * will be called when the function without the prefix is called.
 */
function getImportedFunctionName(funcName: string) {
  return funcName + "_o";
}

export interface WasmOriginalImportedFunction extends WasmImportedFunction {
  type: "original";
}

export interface WasmModifiedImportedFunction extends WasmImportedFunction {
  type: "modified";
  modifiedParams: WasmType[]; // adjusted params of actual function
  modifiedReturn: WasmType | null;
}

/**
 * Return the WAT AST nodes responsible for calling the imported function (that is used as is), storing the return if needed.
 */
function getOriginalFunctionCallNodes(func: WasmOriginalImportedFunction) {
  const funcArgs: WasmExpression[] = [];
  let bpOffset = 0;
  // get the wasm expressions for loading from memory relative to BP for each arg
  for (const param of func.params) {
    bpOffset += wasmTypeToSize[param];
    funcArgs.push({
      type: "MemoryLoad",
      addr: getPointerArithmeticNode(BASE_POINTER, "-", bpOffset),
      varType: param,
      numOfBytes: wasmTypeToSize[param] as MemoryVariableByteSize,
    });
  }
  const functionCall: WasmRegularFunctionCall = {
    type: "RegularFunctionCall",
    name: getImportedFunctionName(func.name),
    args: funcArgs,
  };
  if (func.return !== null) {
    return {
      type: "MemoryStore",
      addr: getPointerArithmeticNode(BASE_POINTER, "+", WASM_ADDR_SIZE),
      value: functionCall,
      varType: func.return,
      numOfBytes: wasmTypeToSize[func.return] as MemoryVariableByteSize, // TODO: change when implement structs
    };
  } else {
    return functionCall;
  }
}

const wasmModuleImports: Record<
  string,
  WasmOriginalImportedFunction | WasmModifiedImportedFunction
> = {
  // print_int must be modified so we translate calls with ints as value into calls to imported print_int as val
  print_int: {
    type: "modified",
    parentImportedObject: defaultParentImportedObject,
    importedName: getImportedFunctionName("print_int"),
    name: "print_int",
    params: ["i32"], // i32 here is a the address of the int to print
    return: null,
    modifiedParams: ["i32"],
    modifiedReturn: null,
    body: [
      {
        type: "RegularFunctionCall",
        name: getImportedFunctionName("print_int"),
        // call print_int with address of the int to be printed - its in the stack frame
        args: [
          {
            type: "ArithmeticExpression",
            operator: "-",
            leftExpr: basePointerGetNode,
            rightExpr: {
              type: "Const",
              variableType: "i32",
              value: WASM_ADDR_SIZE,
            },
            varType: "i32",
          },
        ],
      },
    ],
  },
};

export default wasmModuleImports;
