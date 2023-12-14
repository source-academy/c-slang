/**
 * WAT Generator module for generating a WAT string from WAT AST.
 */
import { convertVariableToByteStr } from "../translator/memoryUtil";
import { WasmModule } from "~src/wasm-ast/core";
import { generateExprStr } from "~src/wat-generator/expression";
import { generateStatementStr } from "~src/wat-generator/statement";
import { generateLine } from "~src/wat-generator/util";

export function generateWAT(
  module: WasmModule,
  baseIndentation: number = 0,
  testMode?: boolean,
) {
  let watStr = generateLine("(module", baseIndentation);

  if (testMode) {
    watStr += generateLine(
      '(import "console" "log" (func $log (param i32)))',
      baseIndentation + 1,
    );
  }
  // add the memory import
  watStr += generateLine(
    `(import "js" "mem" (memory ${module.memorySize}))`,
    baseIndentation + 1,
  );

  // add the imported functions
  for (const importedFunction of module.importedFunctions) {
    watStr += generateLine(
      `(import ${
        importedFunction.importPath.length > 0
          ? importedFunction.importPath.map((str) => `"${str}"`).join(" ") + " "
          : ""
      }(func $${importedFunction.name}${
        importedFunction.params.length > 0
          ? " " +
            importedFunction.params.map((param) => `(param ${param})`).join(" ")
          : ""
      }${
        importedFunction.return !== null
          ? ` (result ${importedFunction.return})`
          : ""
      }))`,
      baseIndentation + 1,
    );
  }

  // add all the wasm global variable declarations
  for (const global of module.globalWasmVariables) {
    watStr += generateLine(
      `(global $${global.name} (${global.isConst ? "" : "mut"} ${
        global.varType
      }) ${
        global.initializerValue ? generateExprStr(global.initializerValue) : ""
      })`,
      baseIndentation + 1,
    );
  }

  // add all the global variables (in linear memory) declarations
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
          globalVariable,
        )}")`,
        baseIndentation + 1,
      );
  }

  // add all the function definitions
  for (const functionName of Object.keys(module.functions)) {
    const func = module.functions[functionName];
    watStr += generateLine(`(func $${func.name}`, baseIndentation + 1);
    for (const statement of func.body) {
      watStr += generateLine(
        generateStatementStr(statement),
        baseIndentation + 2,
      );
    }
    watStr += generateLine(")", baseIndentation + 1);
  }
  watStr += generateLine("(start $main)", 1);
  watStr += generateLine(")", 0);
  return watStr;
}
