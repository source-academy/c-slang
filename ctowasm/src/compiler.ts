/**
 * Compiler for C to webassembly
 */
import parser from "./parser/parser";
import process from "./processor";
import { generateWAT } from "./wat-generator";
import { compileWatToWasm } from "./wat-to-wasm";
import wasmModuleImports, { ImportedFunction } from "~src/wasmModuleImports";
import translate from "~src/translator";
import { checkForErrors } from "~src/semanticAnalyser";

export interface CompilationResult {
  wasm: Uint8Array;
  initialMemory: number; // initial memory in pages needed for this wasm module
}

export async function compile(
  cSourceCode: string,
  wasmModuleImports?: Record<string, ImportedFunction>,
): Promise<CompilationResult> {
  const CAst = parser.parse(cSourceCode);
  checkForErrors(cSourceCode, CAst, Object.keys(wasmModuleImports)); // use semantic analyzer to check for semantic errors
  const wasmModule = translate(process(cSourceCode, CAst), wasmModuleImports);
  const initialMemory = wasmModule.memorySize; // save the initial memory in pages needed for the module
  const output = await compileWatToWasm(generateWAT(wasmModule));
  return {
    wasm: output,
    initialMemory,
  };
}

// TODO: this function does NOT include handling of memory
export function compileToWat(
  cSourceCode: string,
  wasmModuleImports?: Record<string, ImportedFunction>,
) {
  const CAst = parser.parse(cSourceCode);
  checkForErrors(cSourceCode, CAst, Object.keys(wasmModuleImports)); // use semantic analyzer to check for semantic errors
  const wasmModule = translate(process(cSourceCode, CAst), wasmModuleImports);
  const output = generateWAT(wasmModule);
  return output;
}

export function generate_C_AST(cSourceCode: string) {
  const ast = parser.parse(cSourceCode);
  return JSON.stringify(ast);
}

export function generate_processed_C_AST(cSourceCode: string) {
  const CAst = parser.parse(cSourceCode);
  checkForErrors(cSourceCode, CAst, Object.keys(wasmModuleImports)); // use semantic analyzer to check for semantic errors
  const ast = process(cSourceCode, CAst);
  return JSON.stringify(ast);
}

export function generate_WAT_AST(
  cSourceCode: string,
  wasmModuleImports?: Record<string, ImportedFunction>,
) {
  const CAst = parser.parse(cSourceCode);
  checkForErrors(cSourceCode, CAst, Object.keys(wasmModuleImports)); // use semantic analyzer to check for semantic errors
  const wasmAst = translate(
    process(cSourceCode, parser.parse(cSourceCode)),
    wasmModuleImports,
  );
  return JSON.stringify(wasmAst);
}
