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

interface SuccessfulCompilationResult {
  status: "success";
  wasm: Uint8Array;
  dataSegmentSize: number;
  functionTableSize: number; // size of function table = to number of defined functions in program
  importedModules: ModuleName[]; // all the modules imported into this C program
}

interface FailedCompilationResult {
  status: "failure";
  errorMessage: string;
}

export type CompilationResult =
  | SuccessfulCompilationResult
  | FailedCompilationResult;

export async function compile(
  cSourceCode: string,
  moduleRepository: ModuleRepository
): Promise<CompilationResult> {
  try {
    const CAst = parse(cSourceCode, moduleRepository);
    const { astRootNode, includedModules } = process(CAst, moduleRepository);
    const wasmModule = translate(astRootNode, moduleRepository);
    const output = await compileWatToWasm(generateWat(wasmModule));
    return {
      status: "success",
      wasm: output,
      dataSegmentSize: wasmModule.dataSegmentSize,
      functionTableSize: wasmModule.functionTable.size,
      importedModules: includedModules,
    };
  } catch (e) {
    if (e instanceof SourceCodeError) {
      return {
        status: "failure",
        errorMessage: e.generateCompilationErrorMessage(cSourceCode),
      };
    }
    throw e;
  }
}

interface SuccessfulWatCompilationResult {
  status: "success";
  watOutput: string;
}

interface FailedWatCompilationResult {
  status: "failure";
  errorMessage: string;
}

export type WatCompilationResult =
  | SuccessfulWatCompilationResult
  | FailedWatCompilationResult;

export function compileToWat(
  cSourceCode: string,
  moduleRepository: ModuleRepository
): WatCompilationResult {
  try {
    const CAst = parse(cSourceCode, moduleRepository);
    const { astRootNode } = process(CAst, moduleRepository);
    const wasmModule = translate(astRootNode, moduleRepository);
    const output = generateWat(wasmModule);
    return {
      status: "success",
      watOutput: output,
    };
  } catch (e) {
    if (e instanceof SourceCodeError) {
      return {
        status: "failure",
        errorMessage: `Compilation failed with the following errors: ${e.generateCompilationErrorMessage(cSourceCode)}`,
      };
    }
    throw e;
  }
}

export function generate_C_AST(
  cSourceCode: string,
  moduleRepository: ModuleRepository
) {
  try {
    const ast = parse(cSourceCode, moduleRepository);
    return toJson(ast);
  } catch (e) {
    if (e instanceof SourceCodeError) {
      e.generateCompilationErrorMessage(cSourceCode);
    }
    throw e;
  }
}

export function generate_processed_C_AST(
  cSourceCode: string,
  moduleRepository: ModuleRepository
) {
  try {
    const CAst = parse(cSourceCode, moduleRepository);
    const { astRootNode } = process(CAst, moduleRepository);
    return toJson(astRootNode);
  } catch (e) {
    if (e instanceof SourceCodeError) {
      e.generateCompilationErrorMessage(cSourceCode);
    }
    throw e;
  }
}

export function generate_WAT_AST(
  cSourceCode: string,
  moduleRepository: ModuleRepository
) {
  const CAst = parse(cSourceCode, moduleRepository);
  const { astRootNode } = process(CAst, moduleRepository);
  //checkForErrors(cSourceCode, CAst, Object.keys(wasmModuleImports)); // use semantic analyzer to check for semantic errors
  const wasmAst = translate(astRootNode, moduleRepository);
  return toJson(wasmAst);
}
