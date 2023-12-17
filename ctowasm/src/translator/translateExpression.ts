/**
 * Defines functions for evaluating C AST expression nodes and converting them to corresponding WAT AST nodes.
 */
import {
  PrefixExpression,
  PostfixExpression,
} from "~src/c-ast/unaryExpression";
import { ArrayElementExpr } from "~src/c-ast/arrays";
import {
  AssignmentExpression,
  CompoundAssignmentExpression,
} from "~src/c-ast/assignment";
import { FunctionCall } from "~src/c-ast/functions";
import { Expression } from "~src/c-ast/core";
import { VariableExpr } from "~src/c-ast/variable";
import {
  getFunctionCallStackFrameSetupStatements,
  getFunctionStackFrameTeardownStatements,
} from "~src/translator/memoryUtil";
import { unaryOperatorToInstruction } from "~src/translator/util";
import {
  convertConstantToWasmConst,
  getMemoryAccessDetails,
} from "~src/translator/variableUtil";
import { WasmSymbolTable } from "~src/wasm-ast/functions";
import { WasmMemoryLoad, WasmMemoryStore } from "~src/wasm-ast/memory";
import { WasmModule, WasmExpression } from "~src/wasm-ast/core";
import { Constant } from "~src/c-ast/constants";
import { BinaryExpression } from "~src/c-ast/binaryExpression";

/**
 * Evaluates a given C expression and returns the corresponding WASM expression.
 */
export default function translateExpression(
  wasmRoot: WasmModule,
  symbolTable: WasmSymbolTable,
  expr: Expression
): WasmExpression {
  if (expr.type === "Constant") {
    const n = expr as Constant;
    return convertConstantToWasmConst(n);
  } else if (expr.type === "FunctionCall") {
    const n = expr as FunctionCall;
    // load the return from its region in memory
    // TODO: need to do multiple loads interspaced with stores to support structs later on
    // evaluate all the expressions used as arguments
    const functionArgs = [];
    for (const arg of n.args) {
      functionArgs.push(translateExpression(wasmRoot, symbolTable, arg));
    }
    return {
      type: "FunctionCall",
      name: n.name,
      stackFrameSetup: getFunctionCallStackFrameSetupStatements(
        wasmRoot.functions[n.name],
        functionArgs
      ),
      stackFrameTearDown: getFunctionStackFrameTeardownStatements(
        wasmRoot.functions[n.name],
        true
      ),
    };
  } else if (expr.type === "VariableExpr" || expr.type === "ArrayElementExpr") {
    const n = expr as VariableExpr | ArrayElementExpr;
    const memoryAccessDetails = getMemoryAccessDetails(
      wasmRoot,
      symbolTable,
      n
    );
    return {
      type: "MemoryLoad",
      ...memoryAccessDetails,
    };
  } else if (expr.type === "BinaryExpression") {
    const n = expr as BinaryExpression;
  } else if (expr.type === "PrefixExpression") {
    const n: PrefixExpression = expr as PrefixExpression;
    const memoryAccessDetails = getMemoryAccessDetails(
      wasmRoot,
      symbolTable,
      n.variable
    );
    const wasmNode: WasmMemoryLoad = {
      type: "MemoryLoad",
      preStatements: [
        {
          type: "MemoryStore",

          value: {
            type: "BinaryExpression",
            instruction: unaryOperatorToInstruction[n.operator],
            leftExpr: {
              type: "MemoryLoad",
              ...memoryAccessDetails,
            },
            rightExpr: {
              type: "Const",
              wasmVariableType: "i32",
              value: 1,
            },
          },
          ...memoryAccessDetails,
        },
      ],
      ...memoryAccessDetails,
    };
    return wasmNode;
  } else if (expr.type === "PostfixExpression") {
    const n: PostfixExpression = expr as PostfixExpression;
    const memoryAccessDetails = getMemoryAccessDetails(
      wasmRoot,
      symbolTable,
      n.variable
    );
    const wasmNode: WasmMemoryStore = {
      type: "MemoryStore",
      value: {
        type: "BinaryExpression",
        instruction: unaryOperatorToInstruction[n.operator],
        leftExpr: {
          type: "MemoryLoad",
          ...memoryAccessDetails,
        },
        rightExpr: {
          type: "Const",
          wasmVariableType: "i32",
          value: 1,
        },
      },
      preStatements: [
        {
          type: "MemoryLoad",
          ...memoryAccessDetails,
        },
      ],
      ...memoryAccessDetails,
    };
    return wasmNode;
  } else if (expr.type === "AssignmentExpression") {
    const n = expr as AssignmentExpression;
    const memoryAccessDetails = getMemoryAccessDetails(
      wasmRoot,
      symbolTable,
      n.variable
    );
    return {
      type: "MemoryLoad",
      preStatements: [
        {
          type: "MemoryStore",
          value: translateExpression(wasmRoot, symbolTable, n.value),
          ...memoryAccessDetails,
        },
      ],
      ...memoryAccessDetails,
    };
  } else if (expr.type === "CompoundAssignmentExpression") {
    const n = expr as CompoundAssignmentExpression;
    const memoryAccessDetails = getMemoryAccessDetails(
      wasmRoot,
      symbolTable,
      n.variable
    );
    return {
      type: "MemoryLoad",
      preStatements: [
        {
          type: "MemoryStore",
          value: {
            type: "BinaryExpression",
            instruction: ,
            leftExpr: {
              type: "MemoryLoad",
              ...memoryAccessDetails,
            },
            rightExpr: translateExpression(wasmRoot, symbolTable, n.value),
            varType: memoryAccessDetails.varType,
          },
          ...memoryAccessDetails,
        },
      ],
      ...memoryAccessDetails,
    };
  } else {
    console.assert(
      false,
      `WASM TRANSLATION ERROR: Unhandled C expression node\n${JSON.stringify(
        expr
      )}`
    );
  }
}
