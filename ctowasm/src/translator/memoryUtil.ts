import { WasmFunction } from "~src/wasm-ast/functions";
import {
  WasmMemoryLoad,
  MemoryVariableByteSize,
  WasmDataSegmentArray,
  WasmDataSegmentVariable,
} from "~src/wasm-ast/memory";
import { WasmExpression, WasmStatement, WasmConst } from "~src/wasm-ast/core";

/**
 * Collection of constants and functions related to the memory model.
 */
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

const stackPointerGetNode: WasmExpression = {
  type: "GlobalGet",
  name: STACK_POINTER,
};

const heapPointerGetNode: WasmExpression = {
  type: "GlobalGet",
  name: HEAP_POINTER,
};

const reg1GetNode: WasmExpression = {
  type: "GlobalGet",
  name: REG_1,
};

// Returns the wasm ast node for setting base pointer to the value of an expression
function getBasePointerSetNode(value: WasmExpression): WasmStatement {
  return {
    type: "GlobalSet",
    name: BASE_POINTER,
    value,
  };
}

function getStackPointerSetNode(value: WasmExpression): WasmStatement {
  return {
    type: "GlobalSet",
    name: STACK_POINTER,
    value,
  };
}

// Returns the wasm ast node for setting base pointer to the value of an expression
function getReg1SetNode(value: WasmExpression): WasmStatement {
  return {
    type: "GlobalSet",
    name: REG_1,
    value,
  };
}

/**
 * Returns the WASM AST nodes needed to perform arithmetic on a pointer and push the result on WASM stack.
 */
export function getPointerArithmeticNode(
  pointer: "sp" | "bp" | "hp",
  operator: "+" | "-",
  operand: number,
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

function getPointerIncrementNode(
  pointer: "sp" | "bp" | "hp",
  incVal: number,
): WasmStatement {
  return {
    type: "GlobalSet",
    name: pointer,
    value: getPointerArithmeticNode(pointer, "+", incVal),
  };
}

function getPointerDecrementNode(
  pointer: "sp" | "bp" | "hp",
  decVal: number,
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
  useReturn?: boolean,
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
      getPointerIncrementNode(STACK_POINTER, fn.returnVariable.size),
    );
  }

  return statements;
}

/**
 * Converts a given variable to byte string, for storage in data segment.
 */
export function convertVariableToByteStr(
  variable: WasmDataSegmentArray | WasmDataSegmentVariable,
) {
  if (variable.type === "DataSegmentVariable") {
    return convertWasmNumberToByteStr(variable.initializerValue, variable.size);
  }
  // DataSegmentArray
  let finalStr = "";
  variable.initializerList.forEach((element) => {
    finalStr += convertWasmNumberToByteStr(element, variable.elementSize);
  });
  return finalStr;
}

/**
 * Converts a wasm number to a bytes str with a @size bytes
 */
export function convertWasmNumberToByteStr(num: WasmConst, size: number) {
  const hexString = num.value.toString(16);
  const strSplit = hexString.split("");
  if (hexString.length % 2 == 1) {
    const lastDigit = strSplit[strSplit.length - 1];
    strSplit[strSplit.length - 1] = "0";
    strSplit.push(lastDigit);
  }
  let finalStr = "";
  for (let i = strSplit.length - 1; i >= 0; i = i - 2) {
    finalStr += "\\" + strSplit[i - 1] + strSplit[i];
  }
  const goalSize = size * 3;
  while (finalStr.length < goalSize) {
    finalStr += "\\00";
  }
  return finalStr;
}

/**
 * Returns the wasm nodes responsible for the pre function call setup.
 */
export function getFunctionCallStackFrameSetupStatements(
  calledFunction: WasmFunction, // function that is being called
  functionArgs: WasmExpression[], // arguments passed to this function call
): WasmStatement[] {
  const statements: WasmStatement[] = [];

  // check that there is sufficient space for memory expansion
  const totalStackSpaceRequired =
    WASM_ADDR_SIZE +
    calledFunction.sizeOfLocals +
    calledFunction.sizeOfParams +
    (calledFunction.returnVariable !== null
      ? calledFunction.returnVariable.size
      : 0);
  statements.push({
    type: "SelectStatement",
    condition: {
      type: "ComparisonExpression",
      operator: "<=",
      leftExpr: {
        type: "ArithmeticExpression",
        operator: "-",
        leftExpr: {
          type: "GlobalGet",
          name: STACK_POINTER,
        },
        rightExpr: {
          type: "Const",
          variableType: "i32",
          value: totalStackSpaceRequired,
        },
        varType: "i32",
      },
      rightExpr: heapPointerGetNode,
    },
    actions: [
      // expand the memory since not enough space
      // save the last address of linear memory in REG_1
      {
        type: "GlobalSet",
        name: REG_1,
        value: {
          type: "ArithmeticExpression",
          operator: "*",
          leftExpr: {
            type: "MemorySize",
          },
          rightExpr: {
            type: "Const",
            variableType: "i32",
            value: WASM_PAGE_SIZE,
          },
          varType: "i32",
        },
      },
      // save address of last item in memory to REG_2
      {
        type: "GlobalSet",
        name: REG_2,
        value: {
          type: "ArithmeticExpression",
          operator: "-",
          leftExpr: {
            type: "GlobalGet",
            name: REG_1,
          },
          rightExpr: {
            type: "Const",
            value: 1,
            variableType: "i32",
          },
          varType: "i32",
        },
      },
      // save the size of stack in REG_1
      {
        type: "GlobalSet",
        name: REG_1,
        value: {
          type: "ArithmeticExpression",
          operator: "-",
          leftExpr: {
            type: "GlobalGet",
            name: REG_1,
          },
          rightExpr: stackPointerGetNode,
          varType: "i32",
        },
      },
      // expand the memory since not enough space
      {
        type: "MemoryGrow",
        pagesToGrowBy: {
          type: "Const",
          variableType: "i32",
          value: Math.ceil(totalStackSpaceRequired / WASM_PAGE_SIZE),
        },
      },
      // set stack pointer to target stack pointer adddress

      getStackPointerSetNode({
        type: "ArithmeticExpression",
        operator: "-",
        leftExpr: {
          type: "ArithmeticExpression",
          operator: "*",
          leftExpr: {
            type: "MemorySize",
          },
          rightExpr: {
            type: "Const",
            variableType: "i32",
            value: WASM_PAGE_SIZE,
          },
          varType: "i32",
        },
        rightExpr: {
          type: "GlobalGet",
          name: REG_1,
        },
        varType: "i32",
      }),

      // set REG_1 to the last address of new memory
      {
        type: "GlobalSet",
        name: REG_1,
        value: {
          type: "ArithmeticExpression",
          operator: "-",
          leftExpr: {
            type: "ArithmeticExpression",
            operator: "*",
            leftExpr: {
              type: "MemorySize",
            },
            rightExpr: {
              type: "Const",
              variableType: "i32",
              value: WASM_PAGE_SIZE,
            },
            varType: "i32",
          },
          rightExpr: {
            type: "Const",
            value: 1,
            variableType: "i32",
          },
          varType: "i32",
        },
      },
      // copy the stack memory to the end, get REG_1 to below stack pointer
      {
        type: "Block",
        label: "memcopy_block",
        body: [
          {
            type: "Loop",
            label: "memcopy_loop",
            body: [
              {
                type: "BranchIf",
                label: "memcopy_block",
                condition: {
                  type: "BooleanExpression",
                  expr: {
                    type: "ComparisonExpression",
                    operator: "<",
                    leftExpr: {
                      type: "GlobalGet",
                      name: REG_1,
                    },
                    rightExpr: stackPointerGetNode,
                  },
                },
              },
              // load item addressed by REG_2 to addr of REG_1
              {
                type: "MemoryStore",
                addr: {
                  type: "GlobalGet",
                  name: REG_1,
                },
                value: {
                  type: "MemoryLoad",
                  addr: {
                    type: "GlobalGet",
                    name: REG_2,
                  },
                  varType: "i32",
                  numOfBytes: WASM_ADDR_SIZE,
                },
                varType: "i32",
                numOfBytes: WASM_ADDR_SIZE,
              },
              // decrement REG_1
              {
                type: "GlobalSet",
                name: REG_1,
                value: {
                  type: "ArithmeticExpression",
                  operator: "-",
                  leftExpr: {
                    type: "GlobalGet",
                    name: REG_1,
                  },
                  rightExpr: {
                    type: "Const",
                    value: 1,
                    variableType: "i32",
                  },
                  varType: "i32",
                },
              },
              // decrement REG_2
              {
                type: "GlobalSet",
                name: REG_2,
                value: {
                  type: "ArithmeticExpression",
                  operator: "-",
                  leftExpr: {
                    type: "GlobalGet",
                    name: REG_2,
                  },
                  rightExpr: {
                    type: "Const",
                    value: 1,
                    variableType: "i32",
                  },
                  varType: "i32",
                },
              },
              {
                type: "Branch",
                label: "memcopy_loop",
              },
            ],
          },
        ],
      },
    ],
    elseStatements: [],
  });

  //allocate space for Return type on stack (if have)
  if (calledFunction.returnVariable !== null) {
    statements.push(
      getStackPointerSetNode({
        type: "ArithmeticExpression",
        operator: "-",
        varType: "i32",
        leftExpr: stackPointerGetNode,
        rightExpr: {
          type: "Const",
          variableType: "i32",
          value: calledFunction.returnVariable.size,
        },
      }),
    );
  }

  //allocate space for BP on stack
  statements.push(
    getStackPointerSetNode({
      type: "ArithmeticExpression",
      varType: "i32",
      operator: "-",
      leftExpr: stackPointerGetNode,
      rightExpr: {
        type: "Const",
        variableType: "i32",
        value: WASM_ADDR_SIZE,
      },
    }),
  );

  // push BP onto stack
  statements.push({
    type: "MemoryStore",
    addr: stackPointerGetNode,
    value: basePointerGetNode,
    varType: "i32",
    numOfBytes: WASM_ADDR_SIZE,
  });

  // set REG_1 to be SP - use it for setting param values later. This is the BP of the new stack frame.
  statements.push(getReg1SetNode(stackPointerGetNode));

  // allocate space for params and locals
  statements.push(
    getStackPointerSetNode({
      type: "ArithmeticExpression",
      operator: "-",
      varType: "i32",
      leftExpr: stackPointerGetNode,
      rightExpr: {
        type: "Const",
        variableType: "i32",
        value: calledFunction.sizeOfLocals + calledFunction.sizeOfParams,
      },
    }),
  );

  // set the values of all params
  for (const paramName of Object.keys(calledFunction.params)) {
    const param = calledFunction.params[paramName];
    statements.push({
      type: "MemoryStore",
      addr: {
        type: "ArithmeticExpression",
        operator: "-",
        varType: "i32",
        leftExpr: reg1GetNode,
        rightExpr: {
          type: "Const",
          variableType: "i32",
          value: param.bpOffset,
        },
      },
      value: functionArgs[param.paramIndex],
      varType: "i32",
      numOfBytes: WASM_ADDR_SIZE,
    });
  }

  // set BP to be reg 1
  statements.push(getBasePointerSetNode(reg1GetNode));

  return statements;
}
