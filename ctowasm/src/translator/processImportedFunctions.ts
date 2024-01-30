import {
  WasmFunction,
  WasmImportedFunction,
  WasmRegularFunctionCall,
} from "~src/translator/wasm-ast/functions";
import { convertScalarDataTypeToWasmType } from "./dataTypeUtil";
import { ModuleFunction } from "~src/modules/types";
import { TranslationError } from "~src/errors";
import { ExternalFunction } from "~src/processor/c-ast/core";
import { unpackDataType } from "~src/processor/dataTypeUtil";
import {
  BASE_POINTER,
  getRegisterPointerArithmeticNode,
} from "~src/translator/memoryUtil";
import { getSizeOfScalarDataType } from "~src/common/utils";
import { WASM_ADDR_SIZE } from "~src/common/constants";
import ModuleRepository from "~src/modules";

/**
 * Process the imported functions.
 * These functions must be wrapped within another function so that they can interface with the memory model properly.
 */

export default function processImportedFunctions(
  moduleRepository: ModuleRepository,
  externalCFunctions: ExternalFunction[] // external functions as defined by CAstRoot
): {
  functionImports: WasmImportedFunction[]; // the wasm function imports
  wrappedFunctions: WasmFunction[]; // the wrapped imported functions (what is actually called directly by user code)
} {
  const functionImports: WasmImportedFunction[] = [];
  const wrappedFunctions: WasmFunction[] = [];

  for (const externalCFunction of externalCFunctions) {
    const importedFunction = moduleRepository.modules[externalCFunction.moduleName].moduleFunctions[externalCFunction.name];
    console.assert(typeof importedFunction !== "undefined", "Translator: Imported function not found in module repository");
    functionImports.push({
      name: externalCFunction.name + "_imported",
      importPath: [importedFunction.parentImportedObject, externalCFunction.name],
      wasmParamTypes: externalCFunction.parameters.map((param) =>
        convertScalarDataTypeToWasmType(param.dataType)
      ),
      returnWasmTypes: externalCFunction.returnObjects
        ? externalCFunction.returnObjects.map((retObj) =>
            convertScalarDataTypeToWasmType(retObj.dataType)
          )
        : [],
    });

    // create the function wrapper
    // function wrapper needs to first load up function args into virtual wasm stack from the real stack in linear memory
    // then store the function results from virtual stack into the real stack
    const functionWrapper: WasmFunction = {
      type: "Function",
      name: externalCFunction.name,
      body: [],
    };

    // the actual call to the imported function that the wrapper wraps
    const importedFunctionCall: WasmRegularFunctionCall = {
      type: "RegularFunctionCall",
      name: externalCFunction.name + "_imported",
      args: [],
    };

    // load up the function args
    for (const dataType of importedFunction.functionType.parameters) {
      const unpackedDataType = unpackDataType(dataType); // unpack the data type into series of primary object first
      // start loading up the function args from back to front as the primary object function args within an aggregate object given to the wrapper will be back to front
      for (let i = unpackedDataType.length - 1; i >= 0; --i) {
        // sanity check, should not occur
        if (
          unpackedDataType[i].dataType !==
          externalCFunction.parameters[i].dataType
        ) {
          throw new TranslationError(
            `Load of function args in import function wrapper: Data type of args and param do not match: arg: '${unpackedDataType[i].dataType}' vs param: '${externalCFunction.parameters[i].dataType}' `
          );
        }
        importedFunctionCall.args.push({
          type: "MemoryLoad",
          addr: getRegisterPointerArithmeticNode(
            BASE_POINTER,
            "+",
            externalCFunction.parameters[i].offset
          ),
          wasmDataType: convertScalarDataTypeToWasmType(
            externalCFunction.parameters[i].dataType
          ),
          numOfBytes: getSizeOfScalarDataType(
            externalCFunction.parameters[i].dataType
          ),
        });
      }
    }

    functionWrapper.body.push(importedFunctionCall);

    // now all the return values of the imported function call are on the virtual wasm stack - need to load them into the real stack
    // this needs to be done back to front, as the top of stack contains the last primary data object of the return object
    if (externalCFunction.returnObjects !== null) {
      for (let i = externalCFunction.returnObjects.length - 1; i >= 0; --i) {
        const returnObject = externalCFunction.returnObjects[i];
        functionWrapper.body.push({
          type: "MemoryStoreFromWasmStack",
          addr: getRegisterPointerArithmeticNode(
            "bp",
            "+",
            WASM_ADDR_SIZE + returnObject.offset
          ),
          wasmDataType: convertScalarDataTypeToWasmType(returnObject.dataType),
          numOfBytes: getSizeOfScalarDataType(returnObject.dataType),
        });
      }
    }

    wrappedFunctions.push(functionWrapper);
  }

  return { functionImports, wrappedFunctions };
}
