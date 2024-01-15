/**
 * Defines the vist function for traversing the C AST and translating into WAT-AST.
 */

import { FunctionDefinitionP } from "~src/processor/c-ast/function";
import { STACK_POINTER, convertPrimaryDataObjectDetailsToWasmDataObjectDetails, getPointerDecrementNode, getPointerIncrementNode, getStackSpaceAllocationCheckStatement } from "~src/translator/memoryUtil";
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
  Cfunction: FunctionDefinitionP
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

  const processedBody: WasmStatement[] = [];

  // add the space allocation statements for local variables to function body
  processedBody.push(getStackSpaceAllocationCheckStatement(Cfunction.sizeOfLocals));
  processedBody.push(getPointerDecrementNode(STACK_POINTER, Cfunction.sizeOfLocals));

  // translate statements in function body
  Cfunction.body.forEach((statement) =>
    processedBody.push(translateStatement(statement))
  );

  // add the deallocation of locals
  processedBody.push(getPointerIncrementNode(STACK_POINTER, Cfunction.sizeOfLocals));

  return {
    type: "Function",
    name: Cfunction.name,
    body: processedBody
  };
}
