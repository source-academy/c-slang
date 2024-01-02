/**
 * Compiler for C to webassembly
 */
import parser from "./parser/parser";
import process from "./processor";
import { generateWat } from "./wat-generator";
import { compileWatToWasm } from "./wat-to-wasm";
import { ImportedFunction } from "~src/wasmModuleImports";
import translate from "~src/translator";
import { toJson } from "~src/errors";

export interface CompilationResult {
  wasm: Uint8Array;
  initialMemory: number; // initial memory in pages needed for this wasm module
}

export async function compile(
  cSourceCode: string,
  wasmModuleImports?: Record<string, ImportedFunction>
): Promise<CompilationResult> {
  const CAst = parser.parse(cSourceCode);
  //checkForErrors(cSourceCode, CAst, Object.keys(wasmModuleImports)); // use semantic analyzer to check for semantic errors
  const wasmModule = translate(process(cSourceCode, CAst), wasmModuleImports);
  const initialMemory = wasmModule.memorySize; // save the initial memory in pages needed for the module
  const output = await compileWatToWasm(generateWat(wasmModule));
  return {
    wasm: output,
    initialMemory,
  };
}

// TODO: this function does NOT include handling of memory
export function compileToWat(
  cSourceCode: string,
  wasmModuleImports?: Record<string, ImportedFunction>
) {
  const CAst = parser.parse(cSourceCode);
  //checkForErrors(cSourceCode, CAst, Object.keys(wasmModuleImports)); // use semantic analyzer to check for semantic errors
  const wasmModule = translate(process(cSourceCode, CAst), wasmModuleImports);
  const output = generateWat(wasmModule);
  return output;
}

export function generate_C_AST(cSourceCode: string) {
  const ast = parser.parse(cSourceCode);
  return toJson(ast);
}

export function generate_processed_C_AST(cSourceCode: string) {
  const CAst = parser.parse(cSourceCode);
  //checkForErrors(cSourceCode, CAst, Object.keys(wasmModuleImports)); // use semantic analyzer to check for semantic errors
  const ast = process(cSourceCode, CAst);
  return toJson(ast);
}

export function generate_WAT_AST(
  cSourceCode: string,
  wasmModuleImports?: Record<string, ImportedFunction>
) {
  const CAst = parser.parse(cSourceCode);
  //checkForErrors(cSourceCode, CAst, Object.keys(wasmModuleImports)); // use semantic analyzer to check for semantic errors
  const wasmAst = translate(
    process(cSourceCode, parser.parse(cSourceCode)),
    wasmModuleImports
  );
  return toJson(wasmAst);
}
