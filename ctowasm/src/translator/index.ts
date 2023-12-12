/**
 * Exports a translate function that takes a C AST and produces a webassembly AST
 */


import {
  WASM_PAGE_SIZE,
  BASE_POINTER,
  PARAM_PREFIX,
  WASM_ADDR_SIZE,
  STACK_POINTER,
  HEAP_POINTER,
  REG_1,
  REG_2,
} from "./memoryUtil";

import {
  WasmArithmeticExpression,
  WasmConst,
  WasmExpression,
  WasmFunction,
  WasmDataSegmentVariable,
  WasmLocalVariable,
  WasmMemoryLoad,
  WasmMemoryStore,
  WasmModule,
  WasmSelectStatement,
  WasmStatement,
  WasmFunctionParameter,
} from "../wasm-ast/wasm-nodes";
import { getVariableSize } from "~src/common/utils";
import visit from "~src/translator/visit";
import {
  convertLiteralToConst,
  generateParamName,
  variableTypeToWasmType,
} from "~src/translator/variableUtil";
import { wasmTypeToSize } from "~src/translator/util";
import { WasmImportedFunction } from "~src/wasmModuleImports";
import { ArrayDeclaration, ArrayInitialization } from "~src/c-ast/arrays";
import { FunctionDefinition } from "~src/c-ast/functions";
import { Literal } from "~src/c-ast/literals";
import { VariableDeclaration, Initialization } from "~src/c-ast/variable";
import { CAstRoot } from "~src/c-ast/root";

/**
 * Creates the global wasm variables that act as psuedo-registers.
 * @param wasmRoot
 * @param stackPreallocate the amount of space in bytes to preallocate before intitial stack pointer position
 * @param dataSegmentSize the size of the data segment in memory
 */
function setPseudoRegisters(
  wasmRoot: WasmModule,
  stackPreallocate: number,
  dataSegmentSize: number
) {
  wasmRoot.globalWasmVariables.push({
    type: "GlobalVariable",
    name: STACK_POINTER,
    varType: "i32",
    initializerValue: {
      type: "Const",
      variableType: "i32",
      value: wasmRoot.memorySize * WASM_PAGE_SIZE - stackPreallocate,
    },
  });

  wasmRoot.globalWasmVariables.push({
    type: "GlobalVariable",
    name: BASE_POINTER,
    varType: "i32",
    initializerValue: {
      type: "Const",
      variableType: "i32",
      value: wasmRoot.memorySize * WASM_PAGE_SIZE, // BP starts at the memory boundary
    },
  });

  // heap segment follows immediately after data segment
  wasmRoot.globalWasmVariables.push({
    type: "GlobalVariable",
    name: HEAP_POINTER,
    varType: "i32",
    initializerValue: {
      type: "Const",
      variableType: "i32",
      value: Math.ceil(dataSegmentSize / 4) * 4, // align to 4 byte boundary
    },
  });

  wasmRoot.globalWasmVariables.push({
    type: "GlobalVariable",
    name: REG_1,
    varType: "i32",
    initializerValue: {
      type: "Const",
      variableType: "i32",
      value: 0,
    },
  });

  wasmRoot.globalWasmVariables.push({
    type: "GlobalVariable",
    name: REG_2,
    varType: "i32",
    initializerValue: {
      type: "Const",
      variableType: "i32",
      value: 0,
    },
  });
}

/**
 * Carries out first pass through of C AST to get function definition information and global variable information.
 * Returns the size of data segment.
 */
function getFunctionDefAndGlobalVarInfo(
  CAstRoot: CAstRoot,
  wasmRoot: WasmModule
): number {
  /**
   * Increases the data segment offset by given amount; expands initial memory if insufficient memory.
   */
  function incrementDataSegmentPosition(currPosition: number, incrAmt: number) {
    const newPosition = (currPosition += incrAmt);
    if (newPosition >= wasmRoot.memorySize * WASM_PAGE_SIZE) {
      // not enough pages, incr pages by 1
      ++wasmRoot.memorySize;
    }
    return newPosition;
  }
  let currDataSegmentPosition = 0;
  // 1st pass - get all function and global variable information
  for (const child of CAstRoot.children) {
    if (child.type === "FunctionDefinition") {
      const n = child as FunctionDefinition;
      let bpOffset = 0;
      const params: Record<string, WasmFunctionParameter> = {};
      n.parameters.forEach((param, paramIndex) => {
        const paramName = generateParamName(param.name);
        bpOffset += getVariableSize(param.variableType);
        params[paramName] = {
          type: "FunctionParameter",
          name: paramName,
          size: getVariableSize(param.variableType),
          paramIndex,
          bpOffset,
          varType: variableTypeToWasmType[param.variableType],
        };
      });
      wasmRoot.functions[n.name] = {
        type: "Function",
        name: n.name,
        params,
        sizeOfLocals: n.sizeOfLocals,
        sizeOfParams: n.sizeOfParameters,
        returnVariable:
          n.returnType !== null
            ? {
                type: "ReturnVariable",
                name: `${n.name}_return`,
                size: n.sizeOfReturn,
                varType: variableTypeToWasmType[n.returnType],
              }
            : null,
        loopCount: 0,
        blockCount: 0,
        locals: {},
        scopes: [new Set()],
        body: [],
        bpOffset,
      };
    } else if (child.type === "VariableDeclaration") {
      const n = child as VariableDeclaration;
      const variableSize = getVariableSize(n.variableType);
      wasmRoot.globals[n.name] = {
        type: "DataSegmentVariable",
        name: n.name,
        size: variableSize,
        memoryAddr: currDataSegmentPosition,
        varType: variableTypeToWasmType[n.variableType],
      };
      currDataSegmentPosition = incrementDataSegmentPosition(
        currDataSegmentPosition,
        variableSize
      );
    } else if (child.type === "Initialization") {
      const n = child as Initialization;
      const variableSize = getVariableSize(n.variableType);
      wasmRoot.globals[n.name] = {
        type: "DataSegmentVariable",
        name: n.name,
        size: variableSize,
        initializerValue: convertLiteralToConst(n.value as Literal),
        memoryAddr: currDataSegmentPosition,
        varType: variableTypeToWasmType[n.variableType],
      };
      currDataSegmentPosition = incrementDataSegmentPosition(
        currDataSegmentPosition,
        variableSize
      );
    } else if (child.type === "ArrayDeclaration") {
      const n = child as ArrayDeclaration;
      const elementSize = getVariableSize(n.variableType);
      const arraySize = n.size * elementSize;
      wasmRoot.globals[n.name] = {
        type: "DataSegmentArray",
        name: n.name,
        size: arraySize,
        //TODO: setting vartype for structs will require some kind of array of vartype loads
        varType: variableTypeToWasmType[n.variableType],
        elementSize,
        memoryAddr: currDataSegmentPosition,
      };
      currDataSegmentPosition = incrementDataSegmentPosition(
        currDataSegmentPosition,
        arraySize
      );
    } else if (child.type === "ArrayInitialization") {
      const n = child as ArrayInitialization;
      const elementSize = getVariableSize(n.variableType);
      const arraySize = n.size * elementSize;
      wasmRoot.globals[n.name] = {
        type: "DataSegmentArray",
        name: n.name,
        size: arraySize,
        //TODO: setting vartype for structs will require some kind of array of vartype loads
        varType: variableTypeToWasmType[n.variableType],
        elementSize,
        memoryAddr: currDataSegmentPosition,
        initializerList: n.elements.map((element) =>
          convertLiteralToConst(element as Literal)
        ),
      };
      currDataSegmentPosition = incrementDataSegmentPosition(
        currDataSegmentPosition,
        arraySize
      );
    }
  }
  return currDataSegmentPosition;
}

/**
 * Adds all the imported functions to the Wasm Module.
 */
function addImportedFunctionsToModule(
  wasmRoot: WasmModule,
  imports: Record<string, WasmImportedFunction>
) {
  // add all the imported functions to wasmRoot.functions
  for (const moduleImportName in imports) {
    const moduleImport = imports[moduleImportName];

    // add the imported function to the list of imported functions in module
    wasmRoot.importedFunctions.push({
      type: "FunctionImport",
      importPath: [moduleImport.parentImportedObject, moduleImport.name],
      name: moduleImport.importedName,
      params: moduleImport.params,
      return: moduleImport.return,
    });

    // construct params
    const params: Record<string, WasmFunctionParameter> = {};
    let bpOffset = 0;
    for (let i = 0; i < moduleImport.params.length; i++) {
      const wasmParamType = moduleImport.params[i];
      bpOffset += wasmTypeToSize[wasmParamType];
      params[`param${i}`] = {
        type: "FunctionParameter",
        name: `param_${i}`,
        size: wasmTypeToSize[wasmParamType],
        varType: wasmParamType,
        paramIndex: i,
        bpOffset: bpOffset,
      };
    }

    wasmRoot.functions[moduleImportName] = {
      type: "Function",
      name: moduleImportName,
      params,
      locals: {}, // no locals, this is an imported js function
      returnVariable:
        moduleImport.return !== null
          ? {
              type: "ReturnVariable",
              name: "return_variable",
              size: wasmTypeToSize[moduleImport.return],
              varType: moduleImport.return,
            }
          : null,
      sizeOfLocals: 0,
      sizeOfParams: bpOffset,
      loopCount: 0,
      blockCount: 0,
      bpOffset: 0,
      scopes: [],
      body: moduleImport.body,
    };
  }
}

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

  // 1st pass over C AST
  const dataSegmentSize = getFunctionDefAndGlobalVarInfo(CAstRoot, wasmRoot);

  setPseudoRegisters(
    wasmRoot,
    wasmRoot.functions["main"].sizeOfLocals,
    dataSegmentSize
  );

  addImportedFunctionsToModule(wasmRoot, imports);

  // 2nd pass - visit all the child nodes of function definitions
  // do this only after all the globals and function information have been set
  for (const child of CAstRoot.children) {
    if (child.type === "FunctionDefinition") {
      const n = child as FunctionDefinition;
      for (const child of n.body.children) {
        visit(wasmRoot, child, wasmRoot.functions[n.name]);
      }
    }
  }

  return wasmRoot;
}
