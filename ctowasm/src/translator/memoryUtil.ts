import { WasmFunction } from "~src/wasm-ast/functions";
import {
  MemoryVariableByteSize,
  WasmMemoryLoad,
} from "~src/wasm-ast/memory";
import { WasmExpression, WasmStatement } from "~src/wasm-ast/core";
import { WasmGlobalGet } from "~src/wasm-ast/variables";
import { WasmBinaryExpression } from "~src/wasm-ast/expressions";
import { WasmIntegerConst } from "~src/wasm-ast/consts";
import { WASM_ADDR_SIZE } from "~src/common/constants";
import { PrimaryDataType } from "~src/common/types";
import { convertScalarDataTypeToWasmType } from "~src/translator/variableUtil";
import { getDataTypeSize } from "~src/common/utils";
import { TranslationError, UnsupportedFeatureError } from "~src/errors";

/**
 * Collection of constants and functions related to the memory model.
 */
export const PARAM_PREFIX = "param_";
export const WASM_PAGE_SIZE = 65536;
export const WASM_ADDR_TYPE = "i32"; // the wasm type of addresses
export const WASM_ADDR_CTYPE: PrimaryDataType = {
  type: "primary",
  primaryDataType: "unsigned int",
}; // the type of an address, in terms of C variable type (32 bit unsigned int)
export const WASM_ADDR_ADD_INSTRUCTION = WASM_ADDR_TYPE + ".add"; // insruction to use when adding wasm address
export const WASM_ADDR_SUB_INSTRUCTION = WASM_ADDR_TYPE + ".sub";
export const WASM_ADDR_MUL_INSTRUCTION = WASM_ADDR_TYPE + ".mul";
export const WASM_ADDR_DIV_INSTRUCTION = WASM_ADDR_TYPE + ".div_u";
export const WASM_ADDR_LE_INSTRUCTION = WASM_ADDR_TYPE + ".le_u";
export const WASM_ADDR_LT_INSTRUCTION = WASM_ADDR_TYPE + ".lt_u";
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
  wasmDataType: WASM_ADDR_TYPE,
} as WasmGlobalGet;

const stackPointerGetNode: WasmExpression = {
  type: "GlobalGet",
  name: STACK_POINTER,
  wasmDataType: WASM_ADDR_TYPE,
} as WasmGlobalGet;

const heapPointerGetNode: WasmExpression = {
  type: "GlobalGet",
  name: HEAP_POINTER,
  wasmDataType: WASM_ADDR_TYPE,
} as WasmGlobalGet;

const reg1GetNode: WasmExpression = {
  type: "GlobalGet",
  name: REG_1,
  wasmDataType: WASM_ADDR_TYPE,
} as WasmGlobalGet;

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
export function getRegisterPointerArithmeticNode(
  registerPointer: "sp" | "bp" | "hp",
  operator: "+" | "-",
  operand: number
): WasmExpression {
  return {
    type: "BinaryExpression",
    instruction:
      operator === "+" ? WASM_ADDR_ADD_INSTRUCTION : WASM_ADDR_SUB_INSTRUCTION,
    wasmDataType: WASM_ADDR_TYPE,
    leftExpr: {
      type: "GlobalGet",
      name: registerPointer,
    } as WasmGlobalGet,
    rightExpr: {
      type: "IntegerConst",
      wasmDataType: WASM_ADDR_TYPE,
      value: BigInt(operand),
    } as WasmIntegerConst,
  } as WasmBinaryExpression;
}

function getPointerIncrementNode(
  pointer: "sp" | "bp" | "hp",
  incVal: number
): WasmStatement {
  return {
    type: "GlobalSet",
    name: pointer,
    value: getRegisterPointerArithmeticNode(pointer, "+", incVal),
  };
}

function getPointerDecrementNode(
  pointer: "sp" | "bp" | "hp",
  decVal: number
): WasmStatement {
  return {
    type: "GlobalSet",
    name: pointer,
    value: getRegisterPointerArithmeticNode(pointer, "+", decVal),
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
      type: "BinaryExpression",
      instruction: WASM_ADDR_ADD_INSTRUCTION,
      wasmDataType: WASM_ADDR_TYPE,
      varType: "i32",
      leftExpr: basePointerGetNode,
      rightExpr: {
        type: "IntegerConst",
        wasmDataType: "i32",
        value: BigInt(WASM_ADDR_SIZE),
      } as WasmIntegerConst,
    } as WasmBinaryExpression),
    getBasePointerSetNode({
      type: "MemoryLoad",
      addr: basePointerGetNode,
      wasmDataType: WASM_ADDR_TYPE,
      numOfBytes: WASM_ADDR_SIZE,
    } as WasmMemoryLoad),
  ];

  if (useReturn) {
    const returnType = fn.returnDataType;
    if (returnType.type === "primary" || returnType.type === "pointer") {
      statements.push({
        type: "MemoryLoad",
        addr: stackPointerGetNode,
        wasmDataType: convertScalarDataTypeToWasmType(returnType),
        numOfBytes: getDataTypeSize(returnType) as MemoryVariableByteSize,
      });
    } else if (returnType.type === "struct") {
      // TODO: needs to be changed when can return structs
      throw new UnsupportedFeatureError("returning a struct");
    } else if (returnType.type === "typedef") {
      throw new UnsupportedFeatureError("returning a custom typedef type");
    } else {
      // cannot return arrays
      throw new TranslationError("Return type cannot be be an array");
    }
  }

  if (fn.returnDataType !== null) {
    statements.push(
      getPointerIncrementNode(STACK_POINTER, getDataTypeSize(fn.returnDataType))
    );
  }

  return statements;
}

/**
 * Returns the wasm nodes responsible for the pre function call setup.
 */
export function getFunctionCallStackFrameSetupStatements(
  calledFunction: WasmFunction, // function that is being called
  functionArgs: WasmExpression[] // arguments passed to this function call
): WasmStatement[] {
  const statements: WasmStatement[] = [];

  // check that there is sufficient space for memory expansion
  const totalStackSpaceRequired =
    WASM_ADDR_SIZE +
    calledFunction.sizeOfLocals +
    calledFunction.sizeOfParams +
    (calledFunction.returnDataType !== null
      ? getDataTypeSize(calledFunction.returnDataType)
      : 0);
  statements.push({
    type: "SelectStatement",
    condition: {
      type: "BinaryExpression",
      instruction: WASM_ADDR_LE_INSTRUCTION,
      leftExpr: {
        type: "BinaryExpression",
        instruction: WASM_ADDR_SUB_INSTRUCTION,
        leftExpr: {
          type: "GlobalGet",
          name: STACK_POINTER,
        },
        rightExpr: {
          type: "IntegerConst",
          wasmDataType: "i32",
          value: BigInt(totalStackSpaceRequired),
        },
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
          type: "BinaryExpression",
          instruction: WASM_ADDR_MUL_INSTRUCTION,
          leftExpr: {
            type: "MemorySize",
          },
          rightExpr: {
            type: "IntegerConst",
            wasmDataType: WASM_ADDR_TYPE,
            value: BigInt(WASM_PAGE_SIZE),
          },
        },
      },
      // save address of last item in memory to REG_2
      {
        type: "GlobalSet",
        name: REG_2,
        value: {
          type: "BinaryExpression",
          instruction: WASM_ADDR_SUB_INSTRUCTION,
          leftExpr: {
            type: "GlobalGet",
            name: REG_1,
          },
          rightExpr: {
            type: "IntegerConst",
            value: 1n,
            wasmDataType: WASM_ADDR_TYPE,
          },
        },
      },
      // save the size of stack in REG_1
      {
        type: "GlobalSet",
        name: REG_1,
        value: {
          type: "BinaryExpression",
          instruction: WASM_ADDR_SUB_INSTRUCTION,
          leftExpr: {
            type: "GlobalGet",
            name: REG_1,
          },
          rightExpr: stackPointerGetNode,
        },
      },
      // expand the memory since not enough space
      {
        type: "MemoryGrow",
        pagesToGrowBy: {
          type: "IntegerConst",
          wasmDataType: "i32",
          value: BigInt(Math.ceil(totalStackSpaceRequired / WASM_PAGE_SIZE)),
        },
      },
      // set stack pointer to target stack pointer adddress

      getStackPointerSetNode({
        type: "BinaryExpression",
        instruction: WASM_ADDR_SUB_INSTRUCTION,
        leftExpr: {
          type: "BinaryExpression",
          instruction: WASM_ADDR_MUL_INSTRUCTION,
          leftExpr: {
            type: "MemorySize",
          },
          rightExpr: {
            type: "IntegerConst",
            wasmDataType: WASM_ADDR_TYPE,
            value: BigInt(WASM_PAGE_SIZE),
          },
        },
        rightExpr: {
          type: "GlobalGet",
          name: REG_1,
        },
      }),

      // set REG_1 to the last address of new memory
      {
        type: "GlobalSet",
        name: REG_1,
        value: {
          type: "BinaryExpression",
          instruction: WASM_ADDR_SUB_INSTRUCTION,
          leftExpr: {
            type: "BinaryExpression",
            instruction: WASM_ADDR_MUL_INSTRUCTION,
            leftExpr: {
              type: "MemorySize"
            },
            rightExpr: {
              type: "IntegerConst",
              wasmDataType: WASM_ADDR_TYPE,
              value: BigInt(WASM_PAGE_SIZE),
            },
          },
          rightExpr: {
            type: "IntegerConst",
            value: 1n,
            wasmDataType: WASM_ADDR_TYPE,
          },
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
                    type: "BinaryExpression",
                    instruction: WASM_ADDR_LT_INSTRUCTION,
                    leftExpr: {
                      type: "GlobalGet",
                      name: REG_1,
                    },
                    rightExpr: stackPointerGetNode,
                  },
                  wasmDataType: WASM_ADDR_TYPE,
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
                  wasmDataType: WASM_ADDR_TYPE,
                  numOfBytes: WASM_ADDR_SIZE,
                },
                wasmDataType: WASM_ADDR_TYPE,
                numOfBytes: WASM_ADDR_SIZE,
              },
              // decrement REG_1
              {
                type: "GlobalSet",
                name: REG_1,
                value: {
                  type: "BinaryExpression",
                  instruction: WASM_ADDR_SUB_INSTRUCTION,
                  leftExpr: {
                    type: "GlobalGet",
                    name: REG_1,
                  },
                  rightExpr: {
                    type: "IntegerConst",
                    value: 1n,
                    wasmDataType: WASM_ADDR_TYPE,
                  },
                },
              },
              // decrement REG_2
              {
                type: "GlobalSet",
                name: REG_2,
                value: {
                  type: "BinaryExpression",
                  instruction: WASM_ADDR_SUB_INSTRUCTION,
                  leftExpr: {
                    type: "GlobalGet",
                    name: REG_2,
                  },
                  rightExpr: {
                    type: "IntegerConst",
                    value: 1n,
                    wasmDataType: WASM_ADDR_TYPE,
                  },
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
  if (calledFunction.returnDataType !== null) {
    statements.push(
      getStackPointerSetNode({
        type: "BinaryExpression",
        instruction: WASM_ADDR_SUB_INSTRUCTION,
        leftExpr: stackPointerGetNode,
        rightExpr: {
          type: "IntegerConst",
          wasmDataType: WASM_ADDR_TYPE,
          value: BigInt(getDataTypeSize(calledFunction.returnDataType)),
        },
      })
    );
  }

  //allocate space for BP on stack
  statements.push(
    getStackPointerSetNode({
      type: "BinaryExpression",
      instruction: WASM_ADDR_SUB_INSTRUCTION,
      leftExpr: stackPointerGetNode,
      rightExpr: {
        type: "IntegerConst",
        wasmDataType: WASM_ADDR_TYPE,
        value: BigInt(WASM_ADDR_SIZE),
      },
    })
  );

  // push BP onto stack
  statements.push({
    type: "MemoryStore",
    addr: stackPointerGetNode,
    value: basePointerGetNode,
    wasmDataType: WASM_ADDR_TYPE,
    numOfBytes: WASM_ADDR_SIZE,
  });

  // set REG_1 to be SP - use it for setting param values later. This is the BP of the new stack frame.
  statements.push(getReg1SetNode(stackPointerGetNode));

  // allocate space for params and locals
  statements.push(
    getStackPointerSetNode({
      type: "BinaryExpression",
      instruction: WASM_ADDR_SUB_INSTRUCTION,
      leftExpr: stackPointerGetNode,
      rightExpr: {
        type: "IntegerConst",
        wasmDataType: WASM_ADDR_TYPE,
        value: BigInt(
          calledFunction.sizeOfLocals + calledFunction.sizeOfParams
        ),
      },
    })
  );

  // set the values of all params
  for (const paramIndex in calledFunction.params) {
    const param = calledFunction.params[paramIndex];
    statements.push({
      type: "MemoryStore",
      addr: {
        type: "BinaryExpression",
        instruction: WASM_ADDR_SUB_INSTRUCTION,
        leftExpr: reg1GetNode,
        rightExpr: {
          type: "IntegerConst",
          wasmDataType: WASM_ADDR_TYPE,
          value: BigInt(param.offset),
        },
      },
      value: functionArgs[paramIndex],
      wasmDataType: WASM_ADDR_TYPE,
      numOfBytes: WASM_ADDR_SIZE,
    });
  }

  // set BP to be reg 1
  statements.push(getBasePointerSetNode(reg1GetNode));

  return statements;
}
