/**
 * WAT Generator module for generating a WAT string from WAT AST.
 */
import { calculateNumberOfPagesNeededForBytes } from "~src/common/utils";
import { WasmModule } from "~src/translator/wasm-ast/core";
import {
  FUNCTION_TYPE_LABEL,
} from "~src/wat-generator/constants";
import generateWatExpression from "~src/wat-generator/generateWatExpression";
import generateWatStatement from "~src/wat-generator/generateWatStatement";
import { generateLine } from "~src/wat-generator/util";

export function generateWat(module: WasmModule, baseIndentation: number = 0) {
  let watStr = generateLine("(module", baseIndentation);

  // add the memory import
  watStr += generateLine(
    `(import "js" "mem" (memory ${calculateNumberOfPagesNeededForBytes(
      module.dataSegmentSize
    )}))`,
    baseIndentation + 1
  );

  // add the imported functions
  for (const importedFunction of module.importedFunctions) {
    watStr += generateLine(
      `(import ${importedFunction.importPath
        .map((s) => `"${s}"`)
        .join(" ")} (func $${importedFunction.name}${
        importedFunction.wasmParamTypes.length > 0
          ? " " +
            importedFunction.wasmParamTypes
              .map((param) => `(param ${param})`)
              .join(" ")
          : ""
      }${
        importedFunction.returnWasmTypes.length > 0
          ? " " +
            importedFunction.returnWasmTypes
              .map((r) => `(result ${r})`)
              .join(" ")
          : ""
      }))`,
      baseIndentation + 1
    );
  }

  for (const importedGlobal of module.importedGlobalWasmVariables) {
    watStr += generateLine(
      `(global $${importedGlobal.name} (import "js" "${
        importedGlobal.name
      }") (${importedGlobal.isConst ? "" : "mut"} ${
        importedGlobal.wasmDataType
      }))`,
      baseIndentation + 1
    );
  }

  // add the table of functions
  watStr += generateLine(
    `(import "js" "function_table" (table ${module.functionTable.size} funcref))`,
    baseIndentation + 1
  );

  // add all the wasm global variable declarations
  for (const global of module.globalWasmVariables) {
    watStr += generateLine(
      `(global $${global.name} (${global.isConst ? "" : "mut"} ${
        global.wasmDataType
      }) ${
        global.initializerValue
          ? generateWatExpression(global.initializerValue)
          : ""
      })`,
      baseIndentation + 1
    );
  }

  // add all the global variables (in linear memory) intiializations
  watStr += generateLine(
    `(data (i32.const 0) "${module.dataSegmentByteStr}")`,
    baseIndentation + 1
  );

  // add the type of all user defined functions (to wasm the functions simply take no params, no return (memory model handles these))
  watStr += generateLine(
    `(type ${FUNCTION_TYPE_LABEL} (func))`,
    baseIndentation + 1
  );

  // add all functions into the table
  for (const f of module.functionTable.elements) {
    watStr += generateLine(
      `(elem (i32.const ${f.index}) $${f.functionName})`,
      baseIndentation + 1
    );
  }

  // add all the function definitions
  for (const functionName of Object.keys(module.functions)) {
    const func = module.functions[functionName];
    watStr += generateLine(`(func $${func.name}`, baseIndentation + 1);
    for (const statement of func.body) {
      watStr += generateLine(
        generateWatStatement(statement),
        baseIndentation + 2
      );
    }
    watStr += generateLine(")", baseIndentation + 1);
  }

  watStr += generateLine("(start $main)", 1);
  watStr += generateLine(")", 0);
  return watStr;
}
