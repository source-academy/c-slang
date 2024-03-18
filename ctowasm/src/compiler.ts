/**
 * Compiler for C to webassembly
 */
import parse from "./parser";
import process from "./processor";
import { generateWat } from "./wat-generator";
import { compileWatToWasm } from "./wat-to-wasm";
import translate from "~src/translator";
import { ParserCompilationErrors, SourceCodeError, toJson } from "~src/errors";
import ModuleRepository, { ModuleName } from "~src/modules";

export interface SuccessfulCompilationResult {
  status: "success";
  wasm: Uint8Array;
  dataSegmentSize: number;
  functionTableSize: number; // size of function table = to number of defined functions in program
  importedModules: ModuleName[]; // all the modules imported into this C program
  warnings: string[];
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
    const { cAstRoot, warnings } = parse(cSourceCode, moduleRepository);
    const { astRootNode, includedModules } = process(cAstRoot, moduleRepository);
    const wasmModule = translate(astRootNode, moduleRepository);
    const output = await compileWatToWasm(generateWat(wasmModule));
    return {
      status: "success",
      wasm: output,
      dataSegmentSize: wasmModule.dataSegmentSize,
      functionTableSize: wasmModule.functionTable.size,
      importedModules: includedModules,
      warnings
    };
  } catch (e) {
    if (e instanceof SourceCodeError) {
      return {
        status: "failure",
        errorMessage: e.generateCompilationErrorMessage(cSourceCode),
      };
    }
    if (e instanceof ParserCompilationErrors) {
      return {
        status: "failure",
        errorMessage: e.message
      }
    }
    throw e;
  }
}

interface SuccessfulWatCompilationResult {
  status: "success";
  watOutput: string;
  warnings: string[];
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
    const { cAstRoot, warnings } = parse(cSourceCode, moduleRepository);
    const { astRootNode } = process(cAstRoot, moduleRepository);
    const wasmModule = translate(astRootNode, moduleRepository);
    const output = generateWat(wasmModule);
    return {
      status: "success",
      watOutput: output,
      warnings
    };
  } catch (e) {
    if (e instanceof SourceCodeError) {
      return {
        status: "failure",
        errorMessage: e.generateCompilationErrorMessage(cSourceCode),
      };
    }
    if (e instanceof ParserCompilationErrors) {
      return {
        status: "failure",
        errorMessage: e.message
      }
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
    if (e instanceof ParserCompilationErrors) {
      return {
        status: "failure",
        errorMessage: e.message
      }
    }
    throw e;
  }
}

export function generate_processed_C_AST(
  cSourceCode: string,
  moduleRepository: ModuleRepository
) {
  try {
    const { cAstRoot } = parse(cSourceCode, moduleRepository);
    const { astRootNode } = process(cAstRoot, moduleRepository);
    return toJson(astRootNode);
  } catch (e) {
    if (e instanceof SourceCodeError) {
      e.generateCompilationErrorMessage(cSourceCode);
    }
    if (e instanceof ParserCompilationErrors) {
      return {
        status: "failure",
        errorMessage: e.message
      }
    }
    throw e;
  }
}

export function generate_WAT_AST(
  cSourceCode: string,
  moduleRepository: ModuleRepository
) {
  const { cAstRoot } = parse(cSourceCode, moduleRepository);
    const { astRootNode } = process(cAstRoot, moduleRepository);
  //checkForErrors(cSourceCode, CAst, Object.keys(wasmModuleImports)); // use semantic analyzer to check for semantic errors
  const wasmAst = translate(astRootNode, moduleRepository);
  return toJson(wasmAst);
}
