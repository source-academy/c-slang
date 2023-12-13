/**
 * This file contains utility functions related to variables.
 */

import { ArrayElementExpr } from "~src/c-ast/arrays";
import { Literal } from "~src/c-ast/literals";
import { Expression } from "~src/c-ast/core";
import { VariableExpr } from "~src/c-ast/variable";
import { VariableType } from "~src/common/types";
import { TranslationError } from "~src/errors";
import evaluateExpression from "~src/translator/evaluateExpression";
import { BASE_POINTER, PARAM_PREFIX } from "~src/translator/memoryUtil";
import { WasmType } from "~src/wasm-ast/types";
import { WasmConst, WasmModule, WasmExpression } from "~src/wasm-ast/core";
import { WasmFunction } from "~src/wasm-ast/functions";
import { WasmLocalVariable, WasmLocalArray, MemoryVariableByteSize, WasmDataSegmentArray } from "~src/wasm-ast/memory";

export const variableTypeToWasmType: Record<VariableType, WasmType> = {
  int: "i32",
  char: "i32",
};

/**
 * Converts a given Literal to a WasmConst
 */
export function convertLiteralToConst(literal: Literal): WasmConst {
  let type: WasmType;
  if (literal.type === "Integer") {
    type = "i32";
  }
  return {
    type: "Const",
    variableType: type,
    value: literal.value,
  };
}

/**
 * Returns the given function parameter name prefixed with "param_".
 */
export function generateParamName(name: string) {
  return PARAM_PREFIX + name;
}

/**
 * Converts a given variable name to a scoped variable name (meaning that scope information is included in the name itself).
 * This is to make up for wasm not having block scope. Thus we can have multiple vars of the same name (in C) in the same function
 * as long as they are in different blocks since their names in wat will be different.
 */
export function convertVarNameToScopedVarName(name: string, block: number) {
  return `${name}_${block.toString()}`;
}

/**
 * Finds out in which scope a variable that is being assigned to or used in an expression belongs in,
 * and generates the name of that variable accordingly.
 */
export function getWasmVariableName(
  originalVariableName: string,
  enclosingFunc: WasmFunction
) {
  for (let i = enclosingFunc.scopes.length - 1; i >= 0; --i) {
    if (enclosingFunc.scopes[i].has(originalVariableName)) {
      return convertVarNameToScopedVarName(originalVariableName, i);
    }
  }
  // check if variable is function parameter
  if (generateParamName(originalVariableName) in enclosingFunc.params) {
    return generateParamName(originalVariableName);
  }

  // if reach this point, variable must be a global variable
  return originalVariableName;
}

/**
 * Returns the ast nodes that equal to the address to use for memory instructions for a variable,
 * depending on whether it is a local or global variable.
 */
export function getVariableAddr(
  wasmRoot: WasmModule,
  variableName: string,
  enclosingFunc: WasmFunction
): WasmExpression {
  const wasmVariableName = getWasmVariableName(variableName, enclosingFunc);
  if (
    wasmVariableName in enclosingFunc.params ||
    wasmVariableName in enclosingFunc.locals
  ) {
    // local variable
    let variable: WasmLocalVariable | WasmLocalArray;
    if (wasmVariableName in enclosingFunc.params) {
      variable = enclosingFunc.params[wasmVariableName];
    } else {
      variable = enclosingFunc.locals[wasmVariableName];
    }

    return {
      type: "ArithmeticExpression",
      operator: "-",
      leftExpr: {
        type: "GlobalGet",
        name: BASE_POINTER,
      },
      rightExpr: {
        type: "Const",
        variableType: "i32",
        value: variable.bpOffset,
      },
      varType: "i32",
    };
  } else {
    // global variable
    const variable = wasmRoot.globals[wasmVariableName];
    return {
      type: "Const",
      variableType: "i32",
      value: variable.memoryAddr,
    };
  }
}

/**
 * Returns the ast nodes that equal to the address to use for memory instructions for a array variable.
 */
export function getArrayElementAddr(
  wasmRoot: WasmModule,
  arrayName: string,
  elementIndex: Expression,
  elementSize: number,
  enclosingFunc: WasmFunction
): WasmExpression {
  return {
    type: "ArithmeticExpression",
    operator: "+",
    leftExpr: getVariableAddr(wasmRoot, arrayName, enclosingFunc),
    rightExpr: {
      type: "ArithmeticExpression",
      operator: "*",
      leftExpr: evaluateExpression(wasmRoot, elementIndex, enclosingFunc),
      rightExpr: {
        type: "Const",
        variableType: "i32",
        value: elementSize,
      },
      varType: "i32",
    },
    varType: "i32",
  };
}

/**
 * All the info needed to access memory during variable read/write.
 */
interface MemoryAccessDetails {
  varType: WasmType; // variable type for memory access
  numOfBytes: MemoryVariableByteSize; // size of memory access
  addr: WasmExpression;
}

/**
 * Retrieve the details of the the primitive variable or array variable from enclosing func/wasmRoot
 */
export function getMemoryAccessDetails(
  wasmRoot: WasmModule,
  expr: VariableExpr | ArrayElementExpr,
  enclosingFunc: WasmFunction
): MemoryAccessDetails {
  const wasmVarName = getWasmVariableName(expr.name, enclosingFunc);
  let variable;
  if (wasmVarName in enclosingFunc.params) {
    variable = enclosingFunc.params[wasmVarName];
  } else if (wasmVarName in enclosingFunc.locals) {
    // the memory access could be
    variable = enclosingFunc.locals[wasmVarName];
  } else {
    variable = wasmRoot.globals[wasmVarName];
  }

  if (expr.type === "VariableExpr") {
    if (
      !(
        variable.type === "LocalVariable" ||
        variable.type === "DataSegmentVariable" ||
        variable.type === "FunctionParameter"
      )
    ) {
      throw new TranslationError(
        "getMemoryAccessDetails error: memory access variable does not match."
      );
    }
    return {
      addr: getVariableAddr(wasmRoot, expr.name, enclosingFunc),
      numOfBytes: variable.size as MemoryVariableByteSize, //TODO: change in future
      varType: variable.varType,
    };
  } else if (expr.type === "ArrayElementExpr") {
    if (
      !(variable.type === "LocalArray" || variable.type === "DataSegmentArray")
    ) {
      throw new TranslationError(
        "getMemoryAccessDetails error: memory access variable does not match."
      );
    }
    const v = variable as WasmDataSegmentArray | WasmLocalArray;
    return {
      addr: getArrayElementAddr(
        wasmRoot,
        expr.name,
        expr.index,
        v.elementSize,
        enclosingFunc
      ),
      numOfBytes: v.elementSize as MemoryVariableByteSize, // the size of one element of //TODO: need to change when have more types
      varType: v.varType,
    };
  } else {
    console.assert(
      false,
      "Translator error: getMemoryAccessDetails failed - no matching expression type"
    );
  }
}

/**
 * Returns the ast nodes that equal to the address to use for memory instructions for a array variable given a constant number as index.
 */
export function getArrayConstantIndexElementAddr(
  wasmRoot: WasmModule,
  arrayName: string,
  elementIndex: number,
  elementSize: number,
  enclosingFunc: WasmFunction
): WasmExpression {
  return {
    type: "ArithmeticExpression",
    operator: "+",
    leftExpr: getVariableAddr(wasmRoot, arrayName, enclosingFunc),
    rightExpr: {
      type: "Const",
      variableType: "i32",
      value: elementIndex * elementSize,
    },
    varType: "i32",
  };
}
