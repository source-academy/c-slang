/**
 * Exports a translate function that takes a C AST and produces a webassembly AST
 */




import visit from "~src/translator/visit";


import { addImportedFunctionsToModule, getFunctionDefAndGlobalVarInfo, setPseudoRegisters } from "~src/translator/util";
import { WasmImportedFunction } from "~src/wasmModuleImports";
import { FunctionDefinition } from "~src/c-ast/functions";
import { WasmModule } from "~src/wasm-ast/core";
import { CAstRoot } from "~src/c-ast/core";


export default function translate(
  CAstRoot: CAstRoot,
  imports: Record<string, WasmImportedFunction> = {},
) {
  const wasmRoot: WasmModule = {
    type: "Module",
    globals: {}, // global variables that are stored in memory
    globalWasmVariables: [], // actual wasm globals
    functions: {},
    memorySize: 1,
    importedFunctions: [],
  };

  // 1st pass over C AST
  const dataSegmentSize = getFunctionDefAndGlobalVarInfo(CAstRoot, wasmRoot);

  setPseudoRegisters(
    wasmRoot,
    wasmRoot.functions["main"].sizeOfLocals,
    dataSegmentSize,
  );

  addImportedFunctionsToModule(wasmRoot, imports);

  // 2nd pass - visit all the child nodes of function definitions
  // do this only after all the globals and function information have been set
  for (const child of CAstRoot.children) {
    if (child.type === "FunctionDefinition") {
      const n = child as FunctionDefinition;
      for (const child of n.body.children) {
        visit(wasmRoot, child, wasmRoot.functions[n.name]);
      }
    }
  }

  return wasmRoot;
}
