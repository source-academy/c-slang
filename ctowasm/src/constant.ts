import { VariableType } from "c-ast/c-nodes";
import {
  MemoryVariableByteSize,
  WasmConst,
  WasmDataSegmentArray,
  WasmDataSegmentVariable,
  WasmExpression,
  WasmFunction,
  WasmMemoryLoad,
  WasmStatement,
} from "wasm-ast/wasm-nodes";

/**
 * Returns the size in bytes of a variable given its type.
 */
export function getVariableSize(varType: VariableType) {
  switch (varType) {
    case "int":
      return 4;
    case "char":
      return 1;
  }
}

export const PARAM_PREFIX = "param_";
export const WASM_PAGE_SIZE = 65536;
export const WASM_ADDR_SIZE = 4; // number of bytes of a wasm address
// the names of stack and base pointer, which are global variables.
export const STACK_POINTER = "sp"; // points to the topmost byte of the stack
export const BASE_POINTER = "bp";
export const HEAP_POINTER = "hp"; // points to the address of first byte after heap
export const REG_1 = "r1"; // general purpose register
export const REG_2 = "r2";

// Wasm AST node for getting the value of base pointer at run time
export const basePointerGetNode: WasmExpression = {
  type: "GlobalGet",
  name: BASE_POINTER,
};

export const stackPointerGetNode: WasmExpression = {
  type: "GlobalGet",
  name: STACK_POINTER,
};

export const heapPointerGetNode: WasmExpression = {
  type: "GlobalGet",
  name: HEAP_POINTER,
};

// Returns the wasm ast node for setting base pointer to the value of an expression
export function getBasePointerSetNode(value: WasmExpression): WasmStatement {
  return {
    type: "GlobalSet",
    name: BASE_POINTER,
    value,
  };
}

export function getStackPointerSetNode(value: WasmExpression): WasmStatement {
  return {
    type: "GlobalSet",
    name: STACK_POINTER,
    value,
  };
}

/**
 * Returns the WASM AST nodes needed to perform arithmetic on a pointer and push the result on WASM stack.
 */
export function getPointerArithmeticNode(
  pointer: "sp" | "bp" | "hp",
  operator: "+" | "-",
  operand: number
): WasmExpression {
  return {
    type: "ArithmeticExpression",
    operator: operator,
    varType: "i32",
    leftExpr: {
      type: "GlobalGet",
      name: pointer,
    },
    rightExpr: {
      type: "Const",
      variableType: "i32",
      value: operand,
    },
  };
}

export function getPointerIncrementNode(
  pointer: "sp" | "bp" | "hp",
  incVal: number
): WasmStatement {
  return {
    type: "GlobalSet",
    name: pointer,
    value: getPointerArithmeticNode(pointer, "+", incVal),
  };
}

export function getPointerDecrementNode(
  pointer: "sp" | "bp" | "hp",
  decVal: number
): WasmStatement {
  return {
    type: "GlobalSet",
    name: pointer,
    value: getPointerArithmeticNode(pointer, "+", decVal),
  };
}

/**
 * Returns the teardown statements for a function stack frame.
 * TODO: radical changes needed when structs are supported.
 */
export function getFunctionStackFrameTeardownStatements(
  fn: WasmFunction,
  useReturn?: boolean
): (WasmStatement | WasmMemoryLoad)[] {
  const statements: (WasmStatement | WasmMemoryLoad)[] = [
    getStackPointerSetNode({
      type: "ArithmeticExpression",
      operator: "+",
      varType: "i32",
      leftExpr: basePointerGetNode,
      rightExpr: {
        type: "Const",
        variableType: "i32",
        value: WASM_ADDR_SIZE,
      },
    }),
    getBasePointerSetNode({
      type: "MemoryLoad",
      addr: basePointerGetNode,
      varType: "i32",
      numOfBytes: WASM_ADDR_SIZE,
    }),
  ];
  
  if (useReturn) {
    statements.push({
      type: "MemoryLoad",
      addr: stackPointerGetNode,
      varType: fn.returnVariable.varType,
      numOfBytes: fn.returnVariable.size as MemoryVariableByteSize,
    });
  }

  if (fn.returnVariable !== null) {
    statements.push(
      getPointerIncrementNode(STACK_POINTER, fn.returnVariable.size)
    );
  }

  return statements;
}

/**
 * Converts a given variable to byte string, for storage in data segment.
 */
export function convertVariableToByteStr(variable: WasmDataSegmentArray | WasmDataSegmentVariable) {
  if (variable.type === "DataSegmentVariable") {
    return convertWasmNumberToByteStr(variable.initializerValue)
  }
  // DataSegmentArray
  let finalStr = ""
  variable.initializerList.forEach(element => {finalStr += convertWasmNumberToByteStr(element)});
  return finalStr;
}

export function convertWasmNumberToByteStr(num: WasmConst) {
  const hexString = num.value.toString(16);
  const strSplit = hexString.split("");
  if (hexString.length % 2 == 1) {
    const lastDigit = strSplit[strSplit.length - 1]
    strSplit[strSplit.length - 1] = "0";
    strSplit.push(lastDigit);
  }
  let finalStr = "";
  for (let i = strSplit.length - 1; i >= 0; i = i - 2) {
    finalStr += "\\" + strSplit[i - 1]  + strSplit[i]
  }
  return finalStr
}