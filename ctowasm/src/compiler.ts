/**
 * Compiler for C to webassembly
 */
import parser from "./parser/parser";
import process from "./processor";
import { generateWAT } from "./wat-generator";
import { compileWatToWasm } from "./wat-to-wasm";
import wasmModuleImports, { WasmImportedFunction } from "~src/wasmModuleImports";
import translate from "~src/translator";

export interface CompilationResult {
  wasm: Uint8Array;
  initialMemory: number; // initial memory in pages needed for this wasm module
}

export async function compile(
  cSourceCode: string,
  wasmModuleImports?: Record<string, WasmImportedFunction>
): Promise<CompilationResult> {
  const wasmModule = translate(
    process(parser.parse(cSourceCode), cSourceCode, Object.keys(wasmModuleImports)),
    wasmModuleImports
  );
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
  wasmModuleImports?: Record<string, WasmImportedFunction>
) {
  const wasmModule = translate(
    process(parser.parse(cSourceCode), cSourceCode, Object.keys(wasmModuleImports)),
    wasmModuleImports
  ); // generates a wasm-ast
  const output = generateWAT(wasmModule);
  return output;
}

export function generate_C_AST(cSourceCode: string) {
  const ast = parser.parse(cSourceCode);
  return JSON.stringify(ast);
}

export function generate_processed_C_AST(cSourceCode: string) {
  const ast = process(parser.parse(cSourceCode), cSourceCode, Object.keys(wasmModuleImports));
  return JSON.stringify(ast);
}

export function generate_WAT_AST(
  cSourceCode: string,
  wasmModuleImports?: Record<string, WasmImportedFunction>
) {
  const ast = translate(
    process(parser.parse(cSourceCode), cSourceCode, Object.keys(wasmModuleImports)),
    wasmModuleImports
  );
  return JSON.stringify(ast);
}
