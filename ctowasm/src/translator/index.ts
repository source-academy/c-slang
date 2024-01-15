/**
 * Translator module which performs translation of C AST to WAT AST.
 */
import { setPseudoRegisters } from "~src/translator/util";
import { ImportedFunction } from "~src/wasmModuleImports";
import { WasmModule } from "~src/translator/wasm-ast/core";
import translateFunction from "~src/translator/translateFunction";
import { CAstRootP } from "~src/processor/c-ast/core";
import processImportedFunctions from "~src/translator/processImportedFunctions";

export default function translate(
  CAstRoot: CAstRootP,
  imports: Record<string, ImportedFunction> = {}
) {
  const wasmRoot: WasmModule = {
    type: "Module",
    dataSegmentByteStr: CAstRoot.dataSegmentByteStr, // byte str to set the data segment to
    globalWasmVariables: [], // actual wasm global variables -  used for pseudo registers
    functions: {},
    memorySize: 1,
    importedFunctions: [],
  };

  let stackPreAllocateSize = 0; // preallocate space for main function stack frame

  const processedImportedFunctions = processImportedFunctions(imports, CAstRoot.externalFunctions);

  wasmRoot.importedFunctions = processedImportedFunctions.functionImports;
  // add function wrappers of imported functions
  processedImportedFunctions.wrappedFunctions.forEach(wrappedFunction => {
    wasmRoot.functions[wrappedFunction.name] = wrappedFunction
  })

  for (const func of CAstRoot.functions) {
    if (func.name === "main") {
      stackPreAllocateSize = func.sizeOfLocals;
    }
    translateFunction(func);
  }

  CAstRoot.functions.forEach((func) => {
    wasmRoot.functions[func.name] = translateFunction(func);
  });

  setPseudoRegisters(
    wasmRoot,
    stackPreAllocateSize,
    CAstRoot.dataSegmentSizeInBytes
  );

  return wasmRoot;
}
