import { WasmFunction } from "~src/wasm-ast/functions";
import { WasmMemoryLoad, WasmMemorySize } from "~src/wasm-ast/memory";
import { WasmExpression, WasmStatement } from "~src/wasm-ast/core";
import { wasmTypeToSize } from "~src/translator/util";
import { WasmGlobalGet } from "~src/wasm-ast/variables";
import { WasmBinaryExpression } from "~src/wasm-ast/expressions";
import { WasmBooleanExpression } from "~src/wasm-ast/misc";
import { WasmIntegerConst } from "~src/wasm-ast/consts";
import { WASM_ADDR_SIZE } from "~src/common/constants";

/**
 * Collection of constants and functions related to the memory model.
 */
export const PARAM_PREFIX = "param_";
export const WASM_PAGE_SIZE = 65536;
export const WASM_ADDR_TYPE = "i32"; // the wasm type of addresses
export const WASM_ADDR_CTYPE = "unsigned int"; // the type of an address, in terms of C variable type
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
  wasmVariableType: WASM_ADDR_TYPE,
} as WasmGlobalGet;

const stackPointerGetNode: WasmExpression = {
  type: "GlobalGet",
  name: STACK_POINTER,
  wasmVariableType: WASM_ADDR_TYPE,
} as WasmGlobalGet;

const heapPointerGetNode: WasmExpression = {
  type: "GlobalGet",
  name: HEAP_POINTER,
  wasmVariableType: WASM_ADDR_TYPE,
} as WasmGlobalGet;

const reg1GetNode: WasmExpression = {
  type: "GlobalGet",
  name: REG_1,
  wasmVariableType: WASM_ADDR_TYPE,
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
export function getPointerArithmeticNode(
  pointer: "sp" | "bp" | "hp",
  operator: "+" | "-",
  operand: number
): WasmExpression {
  return {
    type: "BinaryExpression",
    instruction:
      operator === "+" ? WASM_ADDR_ADD_INSTRUCTION : WASM_ADDR_SUB_INSTRUCTION,
    wasmVariableType: WASM_ADDR_TYPE,
    leftExpr: {
      type: "GlobalGet",
      name: pointer,
    } as WasmGlobalGet,
    rightExpr: {
      type: "IntegerConst",
      wasmVariableType: WASM_ADDR_TYPE,
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
    value: getPointerArithmeticNode(pointer, "+", incVal),
  };
}

function getPointerDecrementNode(
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
      type: "BinaryExpression",
      instruction: WASM_ADDR_ADD_INSTRUCTION,
      wasmVariableType: WASM_ADDR_TYPE,
      varType: "i32",
      leftExpr: basePointerGetNode,
      rightExpr: {
        type: "IntegerConst",
        wasmVariableType: "i32",
        value: BigInt(WASM_ADDR_SIZE),
      } as WasmIntegerConst,
    } as WasmBinaryExpression),
    getBasePointerSetNode({
      type: "MemoryLoad",
      addr: basePointerGetNode,
      wasmVariableType: WASM_ADDR_TYPE,
      numOfBytes: WASM_ADDR_SIZE,
    } as WasmMemoryLoad),
  ];

  // TODO: needs to be changed when can return structs
  if (useReturn) {
    statements.push({
      type: "MemoryLoad",
      addr: stackPointerGetNode,
      wasmVariableType: fn.returnVariable.varType,
      numOfBytes: wasmTypeToSize[fn.returnVariable.varType],
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
    (calledFunction.returnVariable !== null
      ? calledFunction.returnVariable.size
      : 0);
  statements.push({
    type: "SelectStatement",
    condition: {
      type: "BinaryExpression",
      instruction: WASM_ADDR_LE_INSTRUCTION,
      wasmVariableType: WASM_ADDR_TYPE,
      leftExpr: {
        type: "BinaryExpression",
        instruction: WASM_ADDR_SUB_INSTRUCTION,
        wasmVariableType: WASM_ADDR_TYPE,
        leftExpr: {
          type: "GlobalGet",
          name: STACK_POINTER,
          wasmVariableType: WASM_ADDR_TYPE,
        } as WasmGlobalGet,
        rightExpr: {
          type: "IntegerConst",
          wasmVariableType: "i32",
          value: BigInt(totalStackSpaceRequired),
        } as WasmIntegerConst,
        varType: "i32",
      },
      rightExpr: heapPointerGetNode,
    } as WasmBinaryExpression,
    actions: [
      // expand the memory since not enough space
      // save the last address of linear memory in REG_1
      {
        type: "GlobalSet",
        name: REG_1,
        value: {
          type: "BinaryExpression",
          instruction: WASM_ADDR_MUL_INSTRUCTION,
          wasmVariableType: WASM_ADDR_TYPE,
          leftExpr: {
            type: "MemorySize",
          } as WasmMemorySize,
          rightExpr: {
            type: "IntegerConst",
            wasmVariableType: WASM_ADDR_TYPE,
            value: BigInt(WASM_PAGE_SIZE),
          } as WasmIntegerConst,
          varType: "i32",
        } as WasmBinaryExpression,
      },
      // save address of last item in memory to REG_2
      {
        type: "GlobalSet",
        name: REG_2,
        value: {
          type: "BinaryExpression",
          instruction: WASM_ADDR_SUB_INSTRUCTION,
          wasmVariableType: WASM_ADDR_TYPE,
          leftExpr: {
            type: "GlobalGet",
            name: REG_1,
            wasmVariableType: WASM_ADDR_TYPE,
          } as WasmGlobalGet,
          rightExpr: {
            type: "IntegerConst",
            value: 1n,
            wasmVariableType: WASM_ADDR_TYPE,
          } as WasmIntegerConst,
          varType: "i32",
        } as WasmBinaryExpression,
      },
      // save the size of stack in REG_1
      {
        type: "GlobalSet",
        name: REG_1,
        value: {
          type: "BinaryExpression",
          instruction: WASM_ADDR_SUB_INSTRUCTION,
          wasmVariableType: WASM_ADDR_TYPE,
          leftExpr: {
            type: "GlobalGet",
            name: REG_1,
          } as WasmGlobalGet,
          rightExpr: stackPointerGetNode,
        } as WasmBinaryExpression,
      },
      // expand the memory since not enough space
      {
        type: "MemoryGrow",
        pagesToGrowBy: {
          type: "IntegerConst",
          wasmVariableType: "i32",
          value: BigInt(Math.ceil(totalStackSpaceRequired / WASM_PAGE_SIZE)),
        } as WasmIntegerConst,
      },
      // set stack pointer to target stack pointer adddress

      getStackPointerSetNode({
        type: "BinaryExpression",
        instruction: WASM_ADDR_SUB_INSTRUCTION,
        wasmVariableType: WASM_ADDR_TYPE,
        leftExpr: {
          type: "BinaryExpression",
          instruction: WASM_ADDR_MUL_INSTRUCTION,
          wasmVariableType: WASM_ADDR_TYPE,
          leftExpr: {
            type: "MemorySize",
          } as WasmMemorySize,
          rightExpr: {
            type: "IntegerConst",
            wasmVariableType: WASM_ADDR_TYPE,
            value: BigInt(WASM_PAGE_SIZE),
          } as WasmIntegerConst,
        },
        rightExpr: {
          type: "GlobalGet",
          name: REG_1,
          wasmVariableType: WASM_ADDR_TYPE,
        } as WasmGlobalGet,
        varType: "i32",
      } as WasmBinaryExpression),

      // set REG_1 to the last address of new memory
      {
        type: "GlobalSet",
        name: REG_1,
        value: {
          type: "BinaryExpression",
          instruction: WASM_ADDR_SUB_INSTRUCTION,
          wasmVariableType: WASM_ADDR_TYPE,
          leftExpr: {
            type: "BinaryExpression",
            instruction: WASM_ADDR_MUL_INSTRUCTION,
            wasmVariableType: WASM_ADDR_TYPE,
            leftExpr: {
              type: "MemorySize",
            } as WasmMemorySize,
            rightExpr: {
              type: "IntegerConst",
              wasmVariableType: WASM_ADDR_TYPE,
              value: BigInt(WASM_PAGE_SIZE),
            } as WasmIntegerConst,
          },
          rightExpr: {
            type: "IntegerConst",
            value: 1,
            wasmVariableType: "i32",
          },
        } as WasmBinaryExpression,
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
                    wasmVariableType: WASM_ADDR_TYPE,
                    leftExpr: {
                      type: "GlobalGet",
                      name: REG_1,
                    } as WasmGlobalGet,
                    rightExpr: stackPointerGetNode,
                  } as WasmBinaryExpression,
                  wasmVariableType: "i32",
                } as WasmBooleanExpression,
              },
              // load item addressed by REG_2 to addr of REG_1
              {
                type: "MemoryStore",
                addr: {
                  type: "GlobalGet",
                  name: REG_1,
                } as WasmGlobalGet,
                value: {
                  type: "MemoryLoad",
                  addr: {
                    type: "GlobalGet",
                    name: REG_2,
                  } as WasmGlobalGet,
                  wasmVariableType: WASM_ADDR_TYPE,
                  numOfBytes: WASM_ADDR_SIZE,
                } as WasmMemoryLoad,
                wasmVariableType: WASM_ADDR_TYPE,
                numOfBytes: WASM_ADDR_SIZE,
              },
              // decrement REG_1
              {
                type: "GlobalSet",
                name: REG_1,
                value: {
                  type: "BinaryExpression",
                  instruction: WASM_ADDR_SUB_INSTRUCTION,
                  wasmVariableType: WASM_ADDR_TYPE,
                  leftExpr: {
                    type: "GlobalGet",
                    name: REG_1,
                  } as WasmGlobalGet,
                  rightExpr: {
                    type: "IntegerConst",
                    value: BigInt(1),
                    wasmVariableType: WASM_ADDR_TYPE,
                  } as WasmIntegerConst,
                } as WasmBinaryExpression,
              },
              // decrement REG_2
              {
                type: "GlobalSet",
                name: REG_2,
                value: {
                  type: "BinaryExpression",
                  instruction: WASM_ADDR_SUB_INSTRUCTION,
                  wasmVariableType: WASM_ADDR_TYPE,
                  leftExpr: {
                    type: "GlobalGet",
                    name: REG_2,
                  } as WasmGlobalGet,
                  rightExpr: {
                    type: "IntegerConst",
                    value: 1n,
                    wasmVariableType: WASM_ADDR_TYPE,
                  } as WasmIntegerConst,
                  varType: "i32",
                } as WasmBinaryExpression,
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
        type: "BinaryExpression",
        instruction: WASM_ADDR_SUB_INSTRUCTION,
        wasmVariableType: WASM_ADDR_TYPE,
        leftExpr: stackPointerGetNode,
        rightExpr: {
          type: "IntegerConst",
          wasmVariableType: WASM_ADDR_TYPE,
          value: BigInt(calledFunction.returnVariable.size),
        } as WasmIntegerConst,
      } as WasmBinaryExpression)
    );
  }

  //allocate space for BP on stack
  statements.push(
    getStackPointerSetNode({
      type: "BinaryExpression",
      instruction: WASM_ADDR_SUB_INSTRUCTION,
      wasmVariableType: WASM_ADDR_TYPE,
      leftExpr: stackPointerGetNode,
      rightExpr: {
        type: "IntegerConst",
        wasmVariableType: WASM_ADDR_TYPE,
        value: BigInt(WASM_ADDR_SIZE),
      } as WasmIntegerConst,
    } as WasmBinaryExpression)
  );

  // push BP onto stack
  statements.push({
    type: "MemoryStore",
    addr: stackPointerGetNode,
    value: basePointerGetNode,
    wasmVariableType: WASM_ADDR_TYPE,
    numOfBytes: WASM_ADDR_SIZE,
  });

  // set REG_1 to be SP - use it for setting param values later. This is the BP of the new stack frame.
  statements.push(getReg1SetNode(stackPointerGetNode));

  // allocate space for params and locals
  statements.push(
    getStackPointerSetNode({
      type: "BinaryExpression",
      instruction: WASM_ADDR_SUB_INSTRUCTION,
      wasmVariableType: WASM_ADDR_TYPE,
      leftExpr: stackPointerGetNode,
      rightExpr: {
        type: "IntegerConst",
        wasmVariableType: WASM_ADDR_TYPE,
        value: BigInt(
          calledFunction.sizeOfLocals + calledFunction.sizeOfParams
        ),
      } as WasmIntegerConst,
    } as WasmBinaryExpression)
  );

  // set the values of all params
  for (const paramIndex in calledFunction.params) {
    const param = calledFunction.params[paramIndex];
    statements.push({
      type: "MemoryStore",
      addr: {
        type: "BinaryExpression",
        instruction: WASM_ADDR_SUB_INSTRUCTION,
        wasmVariableType: WASM_ADDR_TYPE,
        leftExpr: reg1GetNode,
        rightExpr: {
          type: "IntegerConst",
          wasmVariableType: "i32",
          value: BigInt(param.offset),
        } as WasmIntegerConst,
      } as WasmBinaryExpression,
      value: functionArgs[paramIndex],
      wasmVariableType: WASM_ADDR_TYPE,
      numOfBytes: WASM_ADDR_SIZE,
    });
  }

  // set BP to be reg 1
  statements.push(getBasePointerSetNode(reg1GetNode));

  return statements;
}
