/**
 * Defines functions for evaluating C AST expression nodes and converting them to corresponding WAT AST nodes.
 */
import {
  PrefixExpression,
  PostfixExpression,
} from "~src/c-ast/unaryExpression";
import { ArrayElementExpr } from "~src/c-ast/arrays";
import { AssignmentExpression } from "~src/c-ast/assignment";
import { FunctionCall } from "~src/c-ast/functions";
import { Expression } from "~src/c-ast/core";
import { VariableExpr } from "~src/c-ast/variable";
import { WASM_ADDR_TYPE } from "~src/translator/memoryUtil";
import { unaryOperatorToInstruction } from "~src/translator/util";
import {
  convertConstantToWasmConst,
  getMemoryAccessDetails,
} from "~src/translator/variableUtil";
import {
  WasmFunctionCall,
  WasmRegularFunctionCall,
  WasmSymbolTable,
} from "~src/wasm-ast/functions";
import { WasmMemoryLoad, WasmMemoryStore } from "~src/wasm-ast/memory";
import { WasmModule, WasmExpression, WasmConst } from "~src/wasm-ast/core";
import { Constant } from "~src/c-ast/constants";
import { BinaryExpression } from "~src/c-ast/binaryExpression";
import { WasmBinaryExpression } from "~src/wasm-ast/binaryExpression";
import translateBinaryExpression from "~src/translator/translateBinaryExpression";
import translateFunctionCall from "~src/translator/translateFunctionCall";

/**
 * Evaluates a given C expression and returns the corresponding WASM expression.
 */
export default function translateExpression(
  wasmRoot: WasmModule,
  symbolTable: WasmSymbolTable,
  expr: Expression,
): WasmExpression {
  if (expr.type === "Constant") {
    const n = expr as Constant;
    return convertConstantToWasmConst(n);
  } else if (expr.type === "FunctionCall") {
    const n = expr as FunctionCall;
    // load the return from its region in memory
    // TODO: need to do multiple loads interspaced with stores to support structs later on
    // evaluate all the expressions used as arguments
    return translateFunctionCall(wasmRoot, symbolTable, n) as
      | WasmFunctionCall
      | WasmRegularFunctionCall;
  } else if (expr.type === "VariableExpr" || expr.type === "ArrayElementExpr") {
    const n = expr as VariableExpr | ArrayElementExpr;
    const memoryAccessDetails = getMemoryAccessDetails(
      wasmRoot,
      symbolTable,
      n,
    );
    return {
      type: "MemoryLoad",
      wasmVariableType: memoryAccessDetails.wasmVariableType,
      ...memoryAccessDetails,
    } as WasmMemoryLoad;
  } else if (expr.type === "BinaryExpression") {
    const n = expr as BinaryExpression;
    return translateBinaryExpression(wasmRoot, symbolTable, n);
  } else if (expr.type === "PrefixExpression") {
    const n: PrefixExpression = expr as PrefixExpression;
    const memoryAccessDetails = getMemoryAccessDetails(
      wasmRoot,
      symbolTable,
      n.variable,
    );
    const wasmNode: WasmMemoryLoad = {
      type: "MemoryLoad",
      wasmVariableType: memoryAccessDetails.wasmVariableType,
      preStatements: [
        {
          type: "MemoryStore",
          wasmVariableType: memoryAccessDetails.wasmVariableType,
          value: {
            type: "BinaryExpression",
            instruction: unaryOperatorToInstruction(
              n.operator,
              n.variable.variableType,
            ),
            wasmVariableType: memoryAccessDetails.wasmVariableType,
            leftExpr: {
              type: "MemoryLoad",
              ...memoryAccessDetails,
            } as WasmMemoryLoad,
            rightExpr: {
              type: "Const",
              wasmVariableType: WASM_ADDR_TYPE,
              value: 1,
            } as WasmConst,
          } as WasmBinaryExpression,
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
      n.variable,
    );
    const wasmNode: WasmMemoryStore = {
      type: "MemoryStore",
      value: {
        type: "BinaryExpression",
        instruction: unaryOperatorToInstruction(
          n.operator,
          n.variable.variableType,
        ),
        wasmVariableType: memoryAccessDetails.wasmVariableType,
        leftExpr: {
          type: "MemoryLoad",
          ...memoryAccessDetails,
        },
        rightExpr: {
          type: "Const",
          wasmVariableType: "i32",
          value: 1,
        },
      } as WasmBinaryExpression,
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
      n.variable,
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
    } as WasmMemoryLoad;
  } else {
    console.assert(
      false,
      `WASM TRANSLATION ERROR: Unhandled C expression node\n${JSON.stringify(
        expr,
      )}`,
    );
  }
}
