import { WasmDataObjectMemoryDetails } from "~src/translator/wasm-ast/functions";
import { WasmExpression, WasmStatement } from "~src/translator/wasm-ast/core";
import { WasmGlobalGet } from "~src/translator/wasm-ast/variables";
import { WASM_ADDR_SIZE } from "~src/common/constants";
import { convertScalarDataTypeToWasmType } from "./dataTypeUtil";
import { PrimaryDataTypeMemoryObjectDetails } from "~src/processor/dataTypeUtil";
import { getSizeOfScalarDataType } from "~src/common/utils";
import { FunctionDetails } from "~src/processor/c-ast/function";

/**
 * Collection of constants and functions related to the memory model.
 */
export const PARAM_PREFIX = "param_";
export const WASM_PAGE_SIZE = 65536;
export const WASM_ADDR_TYPE = "i32"; // the wasm type of addresses
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
export const REG_I64 = "ri64"; // gpr for i64 type
export const REG_F32 = "rf32"; // gpr for f32 type
export const REG_F64 = "rf64"; // gpr for f64 type

// Wasm AST node for getting the value of base pointer at run time
export const basePointerGetNode: WasmGlobalGet = {
  type: "GlobalGet",
  name: BASE_POINTER,
};

export const stackPointerGetNode: WasmGlobalGet = {
  type: "GlobalGet",
  name: STACK_POINTER,
};

export const heapPointerGetNode: WasmGlobalGet = {
  type: "GlobalGet",
  name: HEAP_POINTER,
};

const reg1GetNode: WasmGlobalGet = {
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

export function getReg2SetNode(value: WasmExpression): WasmStatement {
  return {
    type: "GlobalSet",
    name: REG_2,
    value,
  };
}

export function convertPrimaryDataObjectDetailsToWasmDataObjectDetails(
  primaryDataObject: PrimaryDataTypeMemoryObjectDetails,
): WasmDataObjectMemoryDetails {
  return {
    dataType: convertScalarDataTypeToWasmType(primaryDataObject.dataType),
    offset: primaryDataObject.offset,
    size: getSizeOfScalarDataType(primaryDataObject.dataType),
  };
}

/**
 * Returns the WASM AST nodes needed to perform arithmetic on a pointer and push the result on WASM stack.
 */
export function getRegisterPointerArithmeticNode(
  registerPointer: "sp" | "bp" | "hp" | "r1",
  operator: "+" | "-",
  operand: number,
): WasmExpression {
  return {
    type: "BinaryExpression",
    instruction:
      operator === "+" ? WASM_ADDR_ADD_INSTRUCTION : WASM_ADDR_SUB_INSTRUCTION,
    leftExpr: {
      type: "GlobalGet",
      name: registerPointer,
    },
    rightExpr: {
      type: "IntegerConst",
      wasmDataType: WASM_ADDR_TYPE,
      value: BigInt(operand),
    },
  };
}

export function getPointerIncrementNode(
  pointer: "sp" | "bp" | "hp" | "r1",
  incVal: number,
): WasmStatement {
  return {
    type: "GlobalSet",
    name: pointer,
    value: getRegisterPointerArithmeticNode(pointer, "+", incVal),
  };
}

export function getPointerDecrementNode(
  pointer: "sp" | "bp" | "hp",
  decVal: number,
): WasmStatement {
  return {
    type: "GlobalSet",
    name: pointer,
    value: getRegisterPointerArithmeticNode(pointer, "-", decVal),
  };
}

/**
 * Returns the teardown statements for a function stack frame.
 */
export function getFunctionCallStackFrameTeardownStatements(
  functionDetails: FunctionDetails,
): WasmStatement[] {
  return [
    // bring the stack pointer back down to end of previous stack frame
    getStackPointerSetNode({
      type: "BinaryExpression",
      instruction: WASM_ADDR_ADD_INSTRUCTION,
      leftExpr: basePointerGetNode,
      rightExpr: {
        type: "IntegerConst",
        wasmDataType: "i32",
        value: BigInt(WASM_ADDR_SIZE + functionDetails.sizeOfReturn),
      },
    }),
    // set base pointer to base pointer of prv frame
    getBasePointerSetNode({
      type: "MemoryLoad",
      addr: basePointerGetNode,
      wasmDataType: WASM_ADDR_TYPE,
      numOfBytes: WASM_ADDR_SIZE,
    }),
  ];
}

/**
 * Returns the statements required to check that there is sufficient memory to expand the stack.
 * If not, attempts to expand linear memory.
 */
export function getStackSpaceAllocationCheckStatement(
  allocationSize: number,
): WasmStatement {
  return {
    type: "SelectionStatement",
    condition: {
      type: "BooleanExpression",
      expr: {
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
            value: BigInt(allocationSize),
          },
        },
        rightExpr: heapPointerGetNode,
      },
      wasmDataType: "i32",
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
          value: BigInt(Math.ceil(allocationSize / WASM_PAGE_SIZE)),
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
              type: "MemorySize",
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
  };
}

/**
 * Returns the wasm nodes responsible for the pre function call setup.
 */
export function getFunctionCallStackFrameSetupStatements(
  functionDetails: FunctionDetails,
  functionArgs: WasmExpression[], // arguments passed to this function call
): WasmStatement[] {
  const statements: WasmStatement[] = [];

  const totalStackSpaceRequired =
    functionDetails.sizeOfParams +
    functionDetails.sizeOfReturn +
    WASM_ADDR_SIZE;

  statements.push(
    getStackSpaceAllocationCheckStatement(totalStackSpaceRequired),
  );

  //allocate space for Return type on stack (if have)
  if (functionDetails.sizeOfReturn > 0) {
    statements.push(
      getPointerDecrementNode(STACK_POINTER, functionDetails.sizeOfReturn),
    );
  }

  //allocate space for BP on stack
  statements.push(getPointerDecrementNode(STACK_POINTER, WASM_ADDR_SIZE));

  //store BP of previous frame
  statements.push({
    type: "MemoryStore",
    addr: stackPointerGetNode,
    value: basePointerGetNode,
    wasmDataType: WASM_ADDR_TYPE,
    numOfBytes: WASM_ADDR_SIZE,
  });

  // allocate space for and set the values of each param
  // args are already in correct order for loading into the stack from high to low address
  for (let i = 0; i < functionDetails.parameters.length; ++i) {
    statements.push(
      getPointerDecrementNode(
        STACK_POINTER,
        getSizeOfScalarDataType(functionDetails.parameters[i].dataType),
      ),
    );
    const param = functionDetails.parameters[i];

    statements.push({
      type: "MemoryStore",
      addr: stackPointerGetNode,
      value: functionArgs[i],
      wasmDataType: convertScalarDataTypeToWasmType(param.dataType),
      numOfBytes: getSizeOfScalarDataType(param.dataType),
    });
  }

  // set BP to be sp + size of params
  statements.push(
    getBasePointerSetNode(
      getRegisterPointerArithmeticNode("sp", "+", functionDetails.sizeOfParams),
    ),
  );

  return statements;
}
