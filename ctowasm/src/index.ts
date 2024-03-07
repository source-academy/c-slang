import ModuleRepository, {
  ModuleName,
  ModulesGlobalConfig,
} from "~src/modules";
import {
  compile,
  compileToWat as originalCompileToWat,
  generate_C_AST as original_generate_C_AST,
  generate_WAT_AST as originalGenerate_WAT_AST,
  generate_processed_C_AST as original_generate_processed_C_AST,
  WatCompilationResult,
} from "./compiler";
import { calculateNumberOfPagesNeededForBytes } from "~src/common/utils";
import { WASM_PAGE_SIZE } from "~src/translator/memoryUtil";
import { SuccessfulCompilationResult } from "~dist/types";

export const defaultModuleRepository = new ModuleRepository(); // default repository containing module information without any custom configs or wasm memory

export function compileToWat(program: string): WatCompilationResult {
  return originalCompileToWat(program, defaultModuleRepository);
}

export function generate_WAT_AST(program: string) {
  return originalGenerate_WAT_AST(program, defaultModuleRepository);
}

export { compile } ;

export class CompilationFailure extends Error {
  constructor(message: string) {
    super(`Compilation failed with the following errors:\n${message}`);
  }
}

/**
 * Compiles the given C program, including all default imported functions.
 */
export async function compileAndRun(
  program: string,
  modulesConfig?: ModulesGlobalConfig,
): Promise<SuccessfulCompilationResult> {
  const compilationResult = await compile(
    program,
    defaultModuleRepository,
  );

  if (compilationResult.status === "failure") {
    throw new CompilationFailure(compilationResult.errorMessage);
  }

  const { wasm, dataSegmentSize, functionTableSize, importedModules } = compilationResult;

  await runWasm(wasm, dataSegmentSize, functionTableSize, importedModules, modulesConfig);

  return compilationResult;
}

export async function runWasm(
  wasm: Uint8Array,
  dataSegmentSize: number,
  functionTableSize: number,
  importedModules: ModuleName[],
  modulesConfig?: ModulesGlobalConfig,
) {
  const numberOfInitialPagesNeeded =
    calculateNumberOfPagesNeededForBytes(dataSegmentSize);
  const moduleRepository = new ModuleRepository(
    new WebAssembly.Memory({ initial: numberOfInitialPagesNeeded }),
    new WebAssembly.Table({ element: "anyfunc", initial: functionTableSize }),
    modulesConfig,
  );
  moduleRepository.setStackPointerValue(
    numberOfInitialPagesNeeded * WASM_PAGE_SIZE,
  );
  moduleRepository.setBasePointerValue(numberOfInitialPagesNeeded * WASM_PAGE_SIZE);
  moduleRepository.setHeapPointerValue(Math.ceil(dataSegmentSize / 4) * 4); // align to 4 bytes

  await WebAssembly.instantiate(
    wasm,
    moduleRepository.createWasmImportsObject(importedModules),
  );
}

export function generate_processed_C_AST(program: string) {
  return original_generate_processed_C_AST(program, defaultModuleRepository);
}

export function generate_C_AST(program: string) {
  return original_generate_C_AST(program, defaultModuleRepository);
}
