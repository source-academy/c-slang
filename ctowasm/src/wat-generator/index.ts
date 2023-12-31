/**
 * WAT Generator module for generating a WAT string from WAT AST.
 */
import { WasmModule } from "~src/wasm-ast/core";
import generateWat from "~src/wat-generator/generateFunctionBodyWat";
import {
  convertVariableToByteStr,
  generateLine,
} from "~src/wat-generator/util";

export function generateWAT(module: WasmModule, baseIndentation: number = 0) {
  let watStr = generateLine("(module", baseIndentation);

  // add the memory import
  watStr += generateLine(
    `(import "js" "mem" (memory ${module.memorySize}))`,
    baseIndentation + 1
  );

  // add the imported functions
  for (const importedFunctionName of Object.keys(module.importedFunctions)) {
    const importedFunction = module.importedFunctions[importedFunctionName];
    watStr += generateLine(
      `(import "${importedFunction.parentImportedObject}" "${
        importedFunction.name
      }" (func $${importedFunction.name}${
        importedFunction.wasmParamTypes.length > 0
          ? " " +
            importedFunction.wasmParamTypes
              .map((param) => `(param ${param})`)
              .join(" ")
          : ""
      }${
        importedFunction.returnWasmType !== null
          ? ` (result ${importedFunction.return})`
          : ""
      }))`,
      baseIndentation + 1
    );
  }

  // add all the wasm global variable declarations
  for (const global of module.globalWasmVariables) {
    watStr += generateLine(
      `(global $${global.name} (${global.isConst ? "" : "mut"} ${
        global.varType
      }) ${
        global.initializerValue
          ? generateWat(global.initializerValue)
          : ""
      })`,
      baseIndentation + 1
    );
  }

  // add all the global variables (in linear memory) declarations
  // TODO: check out what to do when not initialized
  for (const globalVariableName of Object.keys(module.globals)) {
    const globalVariable = module.globals[globalVariableName];
    if (
      (globalVariable.type === "DataSegmentVariable" &&
        typeof globalVariable.initializerValue !== "undefined") ||
      (globalVariable.type === "DataSegmentArray" &&
        typeof globalVariable.initializerList !== "undefined")
    )
      watStr += generateLine(
        `(data (i32.const ${globalVariable.offset}) "${convertVariableToByteStr(
          globalVariable
        )}")`,
        baseIndentation + 1
      );
  }

  // add all the function definitions
  for (const functionName of Object.keys(module.functions)) {
    const func = module.functions[functionName];
    watStr += generateLine(`(func $${func.name}`, baseIndentation + 1);
    for (const statement of func.body) {
      watStr += generateLine(
        generateWat(statement),
        baseIndentation + 2
      );
    }
    watStr += generateLine(")", baseIndentation + 1);
  }
  watStr += generateLine("(start $main)", 1);
  watStr += generateLine(")", 0);
  return watStr;
}
