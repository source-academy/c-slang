/**
 * Compiler for C to webassembly
 */
import { ModuleFunction } from "./modules/types";
import parse from "./parser";
import process from "./processor";
import { generateWat } from "./wat-generator";
import { compileWatToWasm } from "./wat-to-wasm";
import translate from "~src/translator";
import { SourceCodeError, toJson } from "~src/errors";
import ModuleRepository, { ModuleName } from "~src/modules";

export interface CompilationResult {
  wasm: Uint8Array;
  initialMemory: number; // initial memory in pages needed for this wasm module
  importedModules: ModuleName[]; // all the modules imported into this C program
}

export async function compile(
  cSourceCode: string,
  moduleRepository: ModuleRepository
): Promise<CompilationResult> {
  try {
    const CAst = parse(cSourceCode);
    const processedCAst = process(
      CAst,
      moduleRepository
    );
    const wasmModule = translate(processedCAst, moduleRepository);
    const initialMemory = wasmModule.memorySize; // save the initial memory in pages needed for the module
    const output = await compileWatToWasm(generateWat(wasmModule));
    return {
      wasm: output,
      initialMemory,
    };
  } catch (e) {
    if (e instanceof SourceCodeError) {
      e.generateFullErrorMessage(cSourceCode);
    }
    throw e;
  }
}

export function compileToWat(
  cSourceCode: string,
  wasmModuleImports?: Record<string, ModuleFunction>
) {
  try {
    const CAst = parse(cSourceCode);
    const processedCAst = process(
      CAst,
      wasmModuleImports
        ? extractImportedFunctionCDetails(wasmModuleImports)
        : undefined
    );
    const wasmModule = translate(processedCAst, wasmModuleImports);
    const output = generateWat(wasmModule);
    return output;
  } catch (e) {
    if (e instanceof SourceCodeError) {
      e.generateFullErrorMessage(cSourceCode);
    }
    throw e;
  }
}

export function generate_C_AST(cSourceCode: string) {
  try {
    const ast = parse(cSourceCode);
    return toJson(ast);
  } catch (e) {
    if (e instanceof SourceCodeError) {
      e.generateFullErrorMessage(cSourceCode);
    }
    throw e;
  }
}

export function generate_processed_C_AST(
  cSourceCode: string,
  wasmModuleImports?: Record<string, ModuleFunction>
) {
  try {
    const CAst = parse(cSourceCode);
    const processedCAst = process(
      CAst,
      wasmModuleImports
        ? extractImportedFunctionCDetails(wasmModuleImports)
        : undefined
    );
    return toJson(processedCAst);
  } catch (e) {
    if (e instanceof SourceCodeError) {
      e.generateFullErrorMessage(cSourceCode);
    }
    throw e;
  }
}

export function generate_WAT_AST(
  cSourceCode: string,
  wasmModuleImports?: Record<string, ModuleFunction>
) {
  const CAst = parse(cSourceCode);
  const processedCAst = process(
    CAst,
    wasmModuleImports
      ? extractImportedFunctionCDetails(wasmModuleImports)
      : undefined
  );
  //checkForErrors(cSourceCode, CAst, Object.keys(wasmModuleImports)); // use semantic analyzer to check for semantic errors
  const wasmAst = translate(processedCAst, wasmModuleImports);
  return toJson(wasmAst);
}
