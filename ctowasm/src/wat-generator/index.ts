/**
 * WAT Generator module for generating a WAT string from WAT AST.
 */
import { WasmModule } from "~src/translator/wasm-ast/core";
import generateWatExpression from "~src/wat-generator/generateWatExpression";
import generateWatStatement from "~src/wat-generator/generateWatStatement";
import { generateLine } from "~src/wat-generator/util";

export function generateWat(module: WasmModule, baseIndentation: number = 0) {
  let watStr = generateLine("(module", baseIndentation);

  // add the memory import
  watStr += generateLine(
    `(import "js" "mem" (memory ${module.memorySize}))`,
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
