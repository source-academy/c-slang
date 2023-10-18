import { VariableType } from "c-ast/c-nodes";
import { WasmStatement } from "wasm-ast/wasm-nodes";

/**
 * Map of variable type to its size in bytes.
 */
export const variableSizes: Record<VariableType, 1 | 4 | 8 > = {
  int: 4,
  char: 1,
};

export const PARAM_PREFIX = "param_";
export const WASM_PAGE_SIZE = 65536;
export const WASM_ADDR_SIZE = 4; // number of bytes of a wasm address
// the names of stack and base pointer, which are global variables.
export const STACK_POINTER = "sp"; // points to the topmost byte of the stack
export const BASE_POINTER = "bp";
export const HEAP_POINTER = "hp"; // points to the address of first byte after heap
export const REG_1 = "r1"; // general purpose register
export const REG_2 = "r2";

/**
 * Teaddown statements for each function call.
 */
export const functionStackFrameTeardownStatements: WasmStatement[] = [
  {
    type: "GlobalSet",
    name: STACK_POINTER,
    value: {
      type: "ArithmeticExpression",
      operator: "+",
      varType: "i32",
      leftExpr: {
        type: "GlobalGet",
        name: BASE_POINTER,
      },
      rightExpr: {
        type: "Const",
        variableType: "i32",
        value: WASM_ADDR_SIZE,
      },
    },
  },
  {
    type: "GlobalSet",
    name: BASE_POINTER,
    value: {
      type: "MemoryLoad",
      addr: {
        type: "GlobalGet",
        name: BASE_POINTER
      },
      varType: "i32",
      numOfBytes: WASM_ADDR_SIZE
    },
  }
]