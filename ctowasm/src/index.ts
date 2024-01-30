import ModuleRepository, { ModuleName, ModulesGlobalConfig } from "~src/modules";
import {
  compile as originalCompile,
  compileToWat as originalCompileToWat,
  generate_C_AST as original_generate_C_AST,
  generate_WAT_AST as originalGenerate_WAT_AST,
  generate_processed_C_AST as original_generate_processed_C_AST,
} from "./compiler";

export const defaultModuleRepository = new ModuleRepository(); // default repository containing module information without any custom configs or wasm memory
/**
 * Compiles with standard imported functons.
 */
export async function compile(program: string) {
  const { wasm } = await originalCompile(program, defaultModuleRepository);
  return wasm;
}

export function compileToWat(program: string) {
  return originalCompileToWat(program, defaultModuleRepository);
}

export function generate_WAT_AST(program: string) {
  return originalGenerate_WAT_AST(program, defaultModuleRepository);
}

/**
 * Compiles the given C program, including all default imported functions.
 */
export async function compileAndRun(program: string, modulesConfig?: ModulesGlobalConfig) {
  const { wasm, initialMemory, importedModules } = await originalCompile(
    program,
    defaultModuleRepository,
  );
  await runWasm(wasm, initialMemory, importedModules, modulesConfig);
}

export async function runWasm(wasm: Uint8Array, initialMemory: number, importedModules: ModuleName[], modulesConfig?: ModulesGlobalConfig) {
  const moduleRepository = new ModuleRepository(new WebAssembly.Memory({initial: initialMemory}), modulesConfig);
  await WebAssembly.instantiate(wasm, moduleRepository.createWasmImportsObject(importedModules));
}


export function generate_processed_C_AST(program: string) {
  return original_generate_processed_C_AST(program, defaultModuleRepository);
}

export function generate_C_AST(program: string) {
  return original_generate_C_AST(program);
}
