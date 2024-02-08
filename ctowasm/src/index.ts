import ModuleRepository, {
  ModuleName,
  ModulesGlobalConfig,
} from "~src/modules";
import {
  compile as originalCompile,
  compileToWat as originalCompileToWat,
  generate_C_AST as original_generate_C_AST,
  generate_WAT_AST as originalGenerate_WAT_AST,
  generate_processed_C_AST as original_generate_processed_C_AST,
} from "./compiler";
import { calculateNumberOfPagesNeededForBytes } from "~src/common/utils";
import { WASM_PAGE_SIZE } from "~src/translator/memoryUtil";

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
export async function compileAndRun(
  program: string,
  modulesConfig?: ModulesGlobalConfig,
) {
  const { wasm, dataSegmentSize, importedModules } = await originalCompile(
    program,
    defaultModuleRepository,
  );
  await runWasm(wasm, dataSegmentSize, importedModules, modulesConfig);
}

export async function runWasm(
  wasm: Uint8Array,
  dataSegmentSize: number,
  importedModules: ModuleName[],
  modulesConfig?: ModulesGlobalConfig,
) {
  const numberOfInitialPagesNeeded = calculateNumberOfPagesNeededForBytes(dataSegmentSize);
  const moduleRepository = new ModuleRepository(
    new WebAssembly.Memory({ initial: numberOfInitialPagesNeeded }),
    modulesConfig,
  );
  moduleRepository.setStackPointerValue(numberOfInitialPagesNeeded * WASM_PAGE_SIZE);
  moduleRepository.setHeapPointerValue(Math.ceil(dataSegmentSize / 4) * 4) // align to 4 bytes
  await WebAssembly.instantiate(
    wasm,
    moduleRepository.createWasmImportsObject(importedModules),
  );
}

export function generate_processed_C_AST(program: string) {
  return original_generate_processed_C_AST(program, defaultModuleRepository);
}

export function generate_C_AST(program: string) {
  return original_generate_C_AST(program);
}
