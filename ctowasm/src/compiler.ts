/**
 * Compiler for C to webassembly
 */
import parser from "./parser/parser";
import process from "./c-ast/processor";
import { generateWAT } from "./wat-generator";
import { compileWatToWasm } from "./wat-to-wasm";
import { WasmImportedFunction } from "~src/translator/wasmModuleImports";
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
    process(parser.parse(cSourceCode), cSourceCode),
    wasmModuleImports
  ); // generates a wasm-ast
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
    process(parser.parse(cSourceCode), cSourceCode),
    wasmModuleImports
  ); // generates a wasm-ast
  const output = generateWAT(wasmModule);
  return output;
}

/*
export async function compileWithLogStatements(
  cSourceCode: string
): Promise<Uint8Array> {
  const output = await compileWatToWasm(
    generateWAT(
      translate(
        process(parser.parse(cSourceCode), cSourceCode),
        wasmModuleImports,
        true
      ),
      0,
      true
    )
  );
  return output;
}

/**
 * Generates WAT code with log statements for testing.
 */
/*
export function compileToWatWithLogStatements(cSourceCode: string) {
  const output = generateWAT(
    translate(
      process(parser.parse(cSourceCode), cSourceCode),
      wasmModuleImports,
      true
    ),
    0,
    true
  );
  return output;
}
*/

export function generate_C_AST(cSourceCode: string) {
  const ast = parser.parse(cSourceCode);
  return JSON.stringify(ast);
}

export function generate_processed_C_AST(cSourceCode: string) {
  const ast = process(parser.parse(cSourceCode), cSourceCode);
  return JSON.stringify(ast);
}

export function generate_WAT_AST(cSourceCode: string, wasmModuleImports?: Record<string, WasmImportedFunction>) {
  const ast = translate(process(parser.parse(cSourceCode), cSourceCode), wasmModuleImports);
  return JSON.stringify(ast);
}
