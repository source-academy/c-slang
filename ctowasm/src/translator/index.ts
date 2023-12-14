/**
 * Translator module which performs translation of C AST to WAT AST.
 */
import {
  addImportedFunctionsToModule,
  addToSymbolTable,
  createSymbolTable,
  setPseudoRegisters,
} from "~src/translator/util";
import { WasmImportedFunction } from "~src/wasmModuleImports";
import { WasmModule } from "~src/wasm-ast/core";
import { CAstRoot } from "~src/c-ast/core";
import { ArrayDeclaration, ArrayInitialization } from "~src/c-ast/arrays";
import { Constant } from "~src/c-ast/constants";
import { VariableDeclaration, Initialization } from "~src/c-ast/variable";
import { getVariableSize } from "~src/common/utils";
import {
  variableTypeToWasmType,
  convertLiteralToConst,
} from "~src/translator/variableUtil";
import {
  WasmDataSegmentArray,
  WasmDataSegmentVariable,
} from "~src/wasm-ast/memory";
import translateFunction from "~src/translator/translateFunction";

export default function translate(
  CAstRoot: CAstRoot,
  imports: Record<string, WasmImportedFunction> = {}
) {
  const wasmRoot: WasmModule = {
    type: "Module",
    globals: {}, // global variables that are stored in memory
    globalWasmVariables: [], // actual wasm globals
    functions: {},
    memorySize: 1,
    importedFunctions: [],
  };

  addImportedFunctionsToModule(wasmRoot, imports);

  const rootSymbolTable = createSymbolTable(); // root symbol table; contains globals.

  // 1st pass - get all function and global variable information
  for (const child of CAstRoot.children) {
    if (child.type === "FunctionDefinition") {
      translateFunction(wasmRoot, child, rootSymbolTable);
    } else if (
      child.type === "VariableDeclaration" ||
      child.type === "Initialization"
    ) {
      const n = child as VariableDeclaration | Initialization;
      const globalVariable: WasmDataSegmentVariable = {
        type: "DataSegmentVariable",
        name: n.name,
        size: getVariableSize(n.variableType),
        offset: rootSymbolTable.currOffset.value,
        varType: variableTypeToWasmType[n.variableType],
        initializerValue:
          n.type === "Initialization"
            ? convertLiteralToConst(n.value as Constant)
            : undefined,
      };
      addToSymbolTable(rootSymbolTable, globalVariable);
      wasmRoot.globals[n.name] = globalVariable;
    } else if (
      child.type === "ArrayDeclaration" ||
      child.type === "ArrayInitialization"
    ) {
      const n = child as ArrayDeclaration | ArrayInitialization;
      const elementSize = getVariableSize(n.variableType);
      const globalArray: WasmDataSegmentArray = {
        type: "DataSegmentArray",
        name: n.name,
        size: n.size * elementSize,
        arraySize: n.size,
        //TODO: setting vartype for structs will require some kind of array of vartype loads
        varType: variableTypeToWasmType[n.variableType],
        elementSize: elementSize,
        offset: rootSymbolTable.currOffset.value,
        initializerList:
          n.type === "ArrayInitialization"
            ? (n as ArrayInitialization).elements.map((element) =>
                convertLiteralToConst(element as Constant)
              )
            : undefined,
      };
      addToSymbolTable(rootSymbolTable, globalArray);
      wasmRoot.globals[n.name] = globalArray;
    }
  }

  setPseudoRegisters(
    wasmRoot,
    wasmRoot.functions["main"].sizeOfLocals,
    rootSymbolTable.currOffset.value
  );

  return wasmRoot;
}
