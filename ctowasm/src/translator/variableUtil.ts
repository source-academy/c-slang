/**
 * This file contains utility functions related to variables.
 */

import {
  Expression,
  VariableExpr,
  ArrayElementExpr,
  Literal,
} from "~src/c-ast/c-nodes";
import { VariableType } from "~src/common/types";
import { getVariableSize } from "~src/common/utils";
import evaluateExpression from "~src/translator/evaluateExpression";
import { BASE_POINTER, PARAM_PREFIX } from "~src/translator/memoryUtils";
import { WasmType } from "~src/wasm-ast/types";
import {
  WasmFunction,
  WasmExpression,
  WasmLocalVariable,
  WasmLocalArray,
  WasmConst,
  WasmModule,
} from "~src/wasm-ast/wasm-nodes";

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

/**
 * Returns the AST nodes representing expression to get the address of a variable or array element.
 */
export function getVariableOrArrayExprAddr(
  wasmRoot: WasmModule,
  variableExpr: VariableExpr | ArrayElementExpr,
  enclosingFunc: WasmFunction
) {
  return variableExpr.type === "ArrayElementExpr"
    ? getArrayElementAddr(
        wasmRoot,
        variableExpr.arrayName,
        variableExpr.index,
        getVariableSize(variableExpr.variableType),
        enclosingFunc
      )
    : getVariableAddr(wasmRoot, variableExpr.name, enclosingFunc);
}
