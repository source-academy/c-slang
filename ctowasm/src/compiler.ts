/**
 * Compiler for C to webassembly
 */
import parse from "./parser";
import process from "./processor";
import { generateWat } from "./wat-generator";
import { compileWatToWasm } from "./wat-to-wasm";
import translate from "~src/translator";
import { SourceCodeError, toJson } from "~src/errors";
import ModuleRepository, { ModuleName } from "~src/modules";

export interface CompilationResult {
  wasm: Uint8Array;
  dataSegmentSize: number;
  importedModules: ModuleName[]; // all the modules imported into this C program
}

export async function compile(
  cSourceCode: string,
  moduleRepository: ModuleRepository
): Promise<CompilationResult> {
  try {
    const CAst = parse(cSourceCode);
    const { astRootNode, includedModules } = process(CAst, moduleRepository);
    const wasmModule = translate(astRootNode, moduleRepository);
    const output = await compileWatToWasm(generateWat(wasmModule));
    return {
      wasm: output,
      dataSegmentSize: wasmModule.dataSegmentSize,
      importedModules: includedModules,
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
  moduleRepository: ModuleRepository
) {
  try {
    const CAst = parse(cSourceCode);
    const { astRootNode } = process(CAst, moduleRepository);
    const wasmModule = translate(astRootNode, moduleRepository);
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
  moduleRepository: ModuleRepository
) {
  try {
    const CAst = parse(cSourceCode);
    const { astRootNode } = process(CAst, moduleRepository);
    return toJson(astRootNode);
  } catch (e) {
    if (e instanceof SourceCodeError) {
      e.generateFullErrorMessage(cSourceCode);
    }
    throw e;
  }
}

export function generate_WAT_AST(
  cSourceCode: string,
  moduleRepository: ModuleRepository
) {
  const CAst = parse(cSourceCode);
  const { astRootNode } = process(CAst, moduleRepository);
  //checkForErrors(cSourceCode, CAst, Object.keys(wasmModuleImports)); // use semantic analyzer to check for semantic errors
  const wasmAst = translate(astRootNode, moduleRepository);
  return toJson(wasmAst);
}
