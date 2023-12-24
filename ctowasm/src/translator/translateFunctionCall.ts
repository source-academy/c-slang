/**
 * Definition of function to translate function calls.
 */

import { FunctionCall, FunctionCallStatement } from "~src/c-ast/functions";
import {
  getFunctionCallStackFrameSetupStatements,
  getFunctionStackFrameTeardownStatements,
} from "~src/translator/memoryUtil";
import translateExpression from "~src/translator/translateExpression";
import { getTypeConversionWrapper } from "~src/translator/variableUtil";
import { WasmModule } from "~src/wasm-ast/core";
import {
  WasmFunctionCall,
  WasmFunctionCallStatement,
  WasmRegularFunctionCall,
  WasmRegularFunctionCallStatement,
  WasmSymbolTable,
} from "~src/wasm-ast/functions";

export default function translateFunctionCall(
  wasmRoot: WasmModule,
  symbolTable: WasmSymbolTable,
  node: FunctionCall | FunctionCallStatement
) {
  const n = node as FunctionCallStatement;
  if (n.name in wasmRoot.importedFunctions) {
    // special wasm module imported function call - will override any manually written functions that are written manually - TODO: emit warning/error
    const functionBeingCalled = wasmRoot.importedFunctions[n.name];
    const functionArgs = [];
    for (let i = 0; i < n.args.length; ++i) {
      functionArgs.push(
        getTypeConversionWrapper(
          n.args[i].variableType,
          functionBeingCalled.params[i],
          translateExpression(wasmRoot, symbolTable, n.args[i])
        )
      );
    }
    return {
      type:
        node.type === "FunctionCall"
          ? "RegularFunctionCall"
          : "RegularFunctionCallStatement",
      name: n.name,
      args: functionArgs,
    } as WasmRegularFunctionCall | WasmRegularFunctionCallStatement;
  } else {
    const functionArgs = [];
    const functionBeingCalled = wasmRoot.functions[n.name];
    for (let i = 0; i < n.args.length; ++i) {
      functionArgs.push(
        getTypeConversionWrapper(
          n.args[i].variableType,
          functionBeingCalled.params[i].cVarType,
          translateExpression(wasmRoot, symbolTable, n.args[i])
        )
      );
    }
    return {
      type: node.type,
      name: n.name,
      stackFrameSetup: getFunctionCallStackFrameSetupStatements(
        wasmRoot.functions[n.name],
        functionArgs
      ),
      stackFrameTearDown: getFunctionStackFrameTeardownStatements(
        wasmRoot.functions[n.name],
        node.type === "FunctionCall" &&
          wasmRoot.functions[n.name].returnVariable !== null
          ? true
          : false
      ),
    } as WasmFunctionCall | WasmFunctionCallStatement;
  }
}
