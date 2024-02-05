/**
 * Definition of function to translate function calls.
 */

import {
  getFunctionCallStackFrameSetupStatements,
  getFunctionCallStackFrameTeardownStatements,
} from "~src/translator/memoryUtil";
import translateExpression from "~src/translator/translateExpression";
import { WasmExpression } from "~src/translator/wasm-ast/core";
import { WasmFunctionCall, WasmIndirectFunctionCall } from "~src/translator/wasm-ast/functions";
import { FunctionCallP } from "~src/processor/c-ast/function";
import { TranslationError, UnsupportedFeatureError } from "~src/errors";
import { POINTER_TYPE } from "~src/common/constants";

export default function translateFunctionCall(
  node: FunctionCallP,
): WasmFunctionCall | WasmIndirectFunctionCall {
  // translate the arguments
  const functionArgs: WasmExpression[] = [];
  for (
    let i = 0;
    i < node.functionDetails.parameters.length;
    ++i
  ) {
    functionArgs.push(
      translateExpression(
        node.args[i],
        node.functionDetails.parameters[i].dataType,
      ),
    );
  }

  const stackFrameSetup = getFunctionCallStackFrameSetupStatements(
    node.functionDetails,
    functionArgs,
  );

  const stackFrameTearDown = getFunctionCallStackFrameTeardownStatements(
    node.functionDetails,
  )

  if (node.calledFunction.type === "DirectlyCalledFunction") {
    return {
      type: "FunctionCall",
      name: node.calledFunction.functionName,
      stackFrameSetup,
      stackFrameTearDown
    };
  } else if (node.calledFunction.type === "IndirectlyCalledFunction") {
    return {
      type: "IndirectFunctionCall",
      index: translateExpression(node.calledFunction.functionAddress, POINTER_TYPE),
      stackFrameSetup,
      stackFrameTearDown
    }
  } else {
    console.assert(false, "translateFunctionCall(): unreachable block")
    throw new TranslationError("");
  }
}
