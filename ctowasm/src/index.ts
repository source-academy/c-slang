import wasmModuleImports, { setMemory } from "~src/wasmModuleImports";
import {
  compile as originalCompile,
  compileToWat as originalCompileToWat,
  generate_C_AST as original_generate_C_AST,
  generate_WAT_AST as originalGenerate_WAT_AST,
  generate_processed_C_AST as original_generate_processed_C_AST,
} from "./compiler";
export { setPrintFunction } from "~src/wasmModuleImports";

export async function runWasm(wasm: Uint8Array, initialMemory: number) {
  const memory = new WebAssembly.Memory({
    initial: initialMemory,
  });
  // eslint-disable-next-line
  const moduleImports: Record<string, Function> = {};
  Object.keys(wasmModuleImports).forEach(
    (funcName) =>
      (moduleImports[funcName] = wasmModuleImports[funcName].jsFunction),
  );
  setMemory(memory);
  await WebAssembly.instantiate(wasm, {
    imports: moduleImports,
    js: { mem: memory },
  });
}

/**
 * Compiles with standard imported functons.
 */
export async function compile(program: string) {
  const { wasm } = await originalCompile(program, wasmModuleImports);
  return wasm;
}

export function compileToWat(program: string) {
  return originalCompileToWat(program, wasmModuleImports);
}

export function generate_WAT_AST(program: string) {
  return originalGenerate_WAT_AST(program, wasmModuleImports);
}

/**
 * Compiles the given C program, including all default imported functions.
 */
export async function compileAndRun(program: string) {
  const { wasm, initialMemory } = await originalCompile(
    program,
    wasmModuleImports,
  );
  await runWasm(wasm, initialMemory);
}

export function generate_processed_C_AST(program: string) {
  return original_generate_processed_C_AST(program, wasmModuleImports);
}

export function generate_C_AST(program: string) {
  return original_generate_C_AST(program);
}
