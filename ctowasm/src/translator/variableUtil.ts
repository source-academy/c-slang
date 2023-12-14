/**
 * This file contains utility functions related to variables.
 */

import { ArrayElementExpr } from "~src/c-ast/arrays";
import { Constant } from "~src/c-ast/constants";
import { Expression } from "~src/c-ast/core";
import { VariableExpr } from "~src/c-ast/variable";
import { VariableType } from "~src/common/types";
import { TranslationError } from "~src/errors";
import evaluateExpression from "~src/translator/evaluateExpression";
import { BASE_POINTER } from "~src/translator/memoryUtil";
import { WasmType } from "~src/wasm-ast/types";
import { WasmConst, WasmModule, WasmExpression } from "~src/wasm-ast/core";
import { SymbolTable } from "~src/wasm-ast/functions";
import {
  WasmLocalArray,
  MemoryVariableByteSize,
  WasmDataSegmentArray,
} from "~src/wasm-ast/memory";

export const variableTypeToWasmType: Record<VariableType, WasmType> = {
  int: "i32",
  char: "i32",
};

/**
 * Converts a constant to a Wasm const.
 */
export function convertConstantToWasmConst(literal: Constant): WasmConst {
  let type: WasmType;
  if (
    literal.type === "IntegerConstant" ||
    literal.type === "CharacterConstant"
  ) {
    type = "i32";
  }
  return {
    type: "Const",
    variableType: type,
    value: literal.value,
  };
}

/**
 * Retrieves information on variable from given function's symbol table, or from globals in wasmRoot if not found.
 */
export function retrieveVariableFromSymbolTable(
  symbolTable: SymbolTable,
  variableName: string
) {
  let curr = symbolTable;

  while (curr !== null) {
    if (variableName in curr.variables) {
      return curr.variables[variableName];
    }
    curr = curr.parentTable;
  }
  // should not happen
  throw new TranslationError("Translation error: Symbol not found");
}

/**
 * Returns the ast nodes that equal to the address to use for memory instructions for a variable,
 * depending on whether it is a local or global variable.
 */
export function getVariableAddr(
  symbolTable: SymbolTable,
  variableName: string
): WasmExpression {
  const variable = retrieveVariableFromSymbolTable(symbolTable, variableName);
  if (
    variable.type === "DataSegmentArray" ||
    variable.type === "DataSegmentVariable"
  ) {
    // this is a global variable
    return {
      type: "Const",
      variableType: "i32",
      value: variable.offset,
    };
  } else {
    // local variable
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
        value: variable.offset,
      },
      varType: "i32",
    };
  }
}

/**
 * Returns the ast nodes that equal to the address to use for memory instructions for a array variable.
 */
export function getArrayElementAddr(
  wasmRoot: WasmModule,
  symbolTable: SymbolTable,
  arrayName: string,
  elementIndex: Expression,
  elementSize: number
): WasmExpression {
  return {
    type: "ArithmeticExpression",
    operator: "+",
    leftExpr: getVariableAddr(symbolTable, arrayName),
    rightExpr: {
      type: "ArithmeticExpression",
      operator: "*",
      leftExpr: evaluateExpression(wasmRoot, symbolTable, elementIndex),
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
  symbolTable: SymbolTable,
  expr: VariableExpr | ArrayElementExpr
): MemoryAccessDetails {
  const variable = retrieveVariableFromSymbolTable(symbolTable, expr.name);

  if (expr.type === "VariableExpr") {
    if (
      !(
        variable.type === "LocalVariable" ||
        variable.type === "DataSegmentVariable"
      )
    ) {
      throw new TranslationError(
        "getMemoryAccessDetails error: memory access variable does not match."
      );
    }
    return {
      addr: getVariableAddr(symbolTable, expr.name),
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
        symbolTable,
        expr.name,
        expr.index,
        v.elementSize
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
  symbolTable: SymbolTable,
  arrayName: string,
  elementIndex: number,
  elementSize: number
): WasmExpression {
  return {
    type: "ArithmeticExpression",
    operator: "+",
    leftExpr: getVariableAddr(symbolTable, arrayName),
    rightExpr: {
      type: "Const",
      variableType: "i32",
      value: elementIndex * elementSize,
    },
    varType: "i32",
  };
}
