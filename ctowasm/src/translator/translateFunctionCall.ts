/**
 * Definition of function to translate function calls.
 */

import {
  FunctionCall,
  FunctionCallStatement,
} from "~src/parser/c-ast/expression/functionCall";
import {
  getFunctionCallStackFrameSetupStatements,
  getFunctionStackFrameTeardownStatements,
} from "~src/translator/memoryUtil";
import translateExpression from "~src/translator/translateExpression";
import { getTypeConversionWrapper } from "./dataTypeUtil";
import { WasmModule } from "~src/translator/wasm-ast/core";
import {
  WasmFunctionCall,
  WasmFunctionCallStatement,
  WasmRegularFunctionCall,
  WasmRegularFunctionCallStatement,
} from "~src/translator/wasm-ast/functions";
import { WasmSymbolTable } from "./symbolTable";

export default function translateFunctionCall(
  wasmRoot: WasmModule,
  symbolTable: WasmSymbolTable,
  node: FunctionCall | FunctionCallStatement
) {
  const n = node as FunctionCallStatement;
  if (n.expr in wasmRoot.importedFunctions) {
    // special wasm module imported function call - will override any manually written functions that are written manually - TODO: emit warning/error
    const functionBeingCalled = wasmRoot.importedFunctions[n.expr];
    const functionArgs = [];
    for (let i = 0; i < n.args.length; ++i) {
      functionArgs.push(
        getTypeConversionWrapper(
          n.args[i].dataType,
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
      name: n.expr,
      args: functionArgs,
    } as WasmRegularFunctionCall | WasmRegularFunctionCallStatement;
  } else {
    const functionArgs = [];
    const functionBeingCalled = wasmRoot.functions[n.expr];
    for (let i = 0; i < n.args.length; ++i) {
      functionArgs.push(
        getTypeConversionWrapper(
          n.args[i].dataType,
          functionBeingCalled.params[i].dataType,
          translateExpression(wasmRoot, symbolTable, n.args[i])
        )
      );
    }
    return {
      type: node.type,
      name: n.expr,
      stackFrameSetup: getFunctionCallStackFrameSetupStatements(
        wasmRoot.functions[n.expr],
        functionArgs
      ),
      stackFrameTearDown: getFunctionStackFrameTeardownStatements(
        wasmRoot.functions[n.expr],
        node.type === "FunctionCall" &&
          wasmRoot.functions[n.expr].returnDataType !== null
          ? true
          : false
      ),
    } as WasmFunctionCall | WasmFunctionCallStatement;
  }
}
