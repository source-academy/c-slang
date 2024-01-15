/**
 * Definition of function to translate function calls.
 */

import {
  getFunctionCallStackFrameSetupStatements,
  getFunctionCallStackFrameTeardownStatements,
} from "~src/translator/memoryUtil";
import translateExpression from "~src/translator/translateExpression";
import { WasmExpression } from "~src/translator/wasm-ast/core";
import {
  WasmFunctionCall,
  WasmRegularFunctionCall,
} from "~src/translator/wasm-ast/functions";
import {
  FunctionCallP,
} from "~src/processor/c-ast/function";
import { UnsupportedFeatureError } from "~src/errors";

export default function translateFunctionCall(
  node: FunctionCallP
): WasmFunctionCall {

  // translate the arguments
  const functionArgs: WasmExpression[] = [];
  for (let i = 0; i < node.calledFunction.functionDetails.parameters.length; ++i) {
    functionArgs.push(
      translateExpression(node.args[i], node.calledFunction.functionDetails.parameters[i].dataType)
    );
  }

  if (node.calledFunction.type === "FunctionName") {
    return {
      type: "FunctionCall",
      name: node.calledFunction.name,
      stackFrameSetup: getFunctionCallStackFrameSetupStatements(
        node.calledFunction.functionDetails,
        functionArgs
      ),
      stackFrameTearDown: getFunctionCallStackFrameTeardownStatements(
        node.calledFunction.functionDetails
      ),
      };
  } else {
    throw new UnsupportedFeatureError("Function pointers not yet supported");
  }
}
