/**
 * Defines the vist function for traversing the C AST and translating into WAT-AST.
 */

import { FunctionDefinitionP } from "~src/processor/c-ast/function";
import { FUNCTION_BLOCK_LABEL } from "~src/translator/constants";
import {
  STACK_POINTER,
  getPointerDecrementNode,
  getPointerIncrementNode,
  getStackSpaceAllocationCheckStatement,
} from "~src/translator/memoryUtil";
import translateStatement from "~src/translator/translateStatement";
import { WasmStatement } from "~src/translator/wasm-ast/core";
import { WasmFunction } from "~src/translator/wasm-ast/functions";

/**
 * Function for trnslating a C function to a wasm function.
 * For now, expressions execpt function calls are ignored since they are inconsequential. TODO: check this
 * @param wasmRoot the wasm module itself.
 * @param Cfunction the function being translated.
 * @param rootSymbolTable the starting symbol table. contains globals.
 */
export default function translateFunction(
  Cfunction: FunctionDefinitionP,
): WasmFunction {
  // evaluate all parameters first
  // const params: WasmMemoryObject[] = [];
  // Cfunction.parameters.forEach((param) => {
  //   const localVar: WasmMemoryObject = {
  //     type: "LocalMemoryVariable",
  //     name: param.name,
  //     offset: symbolTable.currOffset.value + getDataTypeSize(param.dataType),
  //     dataType: param.dataType,
  //   };
  //   params.push(localVar);
  //   addToSymbolTable(symbolTable, localVar);
  // });

  const functionBody: WasmStatement[] = [];
  // add the space allocation statements for local variables to function body
  functionBody.push(
    getStackSpaceAllocationCheckStatement(Cfunction.sizeOfLocals),
  );
  functionBody.push(
    getPointerDecrementNode(STACK_POINTER, Cfunction.sizeOfLocals),
  );

  // create a block to hold all function body statements
  // returns will branch out of this block, so that the cleanup of stack will proceed before func exits
  functionBody.push({
    type: "Block",
    label: FUNCTION_BLOCK_LABEL,
    body: Cfunction.body.map((statement) => translateStatement(statement)),
  });

  // add the deallocation of locals
  functionBody.push(
    getPointerIncrementNode(STACK_POINTER, Cfunction.sizeOfLocals),
  );

  return {
    type: "Function",
    name: Cfunction.name,
    body: functionBody,
  };
}
