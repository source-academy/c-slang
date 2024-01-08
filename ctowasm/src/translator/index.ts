/**
 * Translator module which performs translation of C AST to WAT AST.
 */
import {
  addToSymbolTable,
  createSymbolTable,
  processImportedFunctions,
  setPseudoRegisters,
} from "~src/translator/util";
import { ImportedFunction } from "~src/wasmModuleImports";
import { WasmModule } from "~src/wasm-ast/core";
import { CAstRoot } from "~src/parser/c-ast/core";
import { Declaration, Initialization } from "~src/parser/c-ast/variable";
import translateFunction from "~src/translator/translateFunction";
import { convertVariableToByteStr } from "~src/translator/dataSegmentUtil";
import { WasmMemoryVariable } from "~src/wasm-ast/memory";

export default function translate(
  CAstRoot: CAstRoot,
  imports: Record<string, ImportedFunction> = {}
) {
  const wasmRoot: WasmModule = {
    type: "Module",
    dataSegmentInitializations: [], // global program variables
    globalWasmVariables: [], // actual wasm global variables -  used for pseudo registers
    functions: {},
    memorySize: 1,
    importedFunctions: processImportedFunctions(imports),
  };

  const rootSymbolTable = createSymbolTable(); // root symbol table; contains globals.

  // 1st pass - get all function and global variable information
  for (const child of CAstRoot.children) {
    if (child.type === "FunctionDefinition") {
      translateFunction(wasmRoot, child, rootSymbolTable);
    } else if (
      child.type === "VariableDeclaration" ||
      child.type === "Initialization"
    ) {
      const n = child as Declaration | Initialization;
      const globalVariable: WasmMemoryVariable = {
        type: "GlobalMemoryVariable",
        name: n.name,
        offset: rootSymbolTable.currOffset.value,
        dataType: n.dataType,
      };
      addToSymbolTable(rootSymbolTable, globalVariable);
      if (n.type === "Initialization") {
        wasmRoot.dataSegmentInitializations.push({
          addr: rootSymbolTable.currOffset.value,
          byteStr: convertVariableToByteStr(n.initializer),
        });
      }
    }
  }

  setPseudoRegisters(
    wasmRoot,
    wasmRoot.functions["main"].sizeOfLocals,
    rootSymbolTable.currOffset.value
  );

  return wasmRoot;
}
