/**
 * Defines functions for evaluating C AST expression nodes and converting them to corresponding WAT AST nodes.
 */
import {
  PrefixArithmeticExpression,
  PostfixArithmeticExpression,
  UnaryExpression,
} from "~src/c-ast/unaryExpression";
import { AssignmentExpression } from "~src/c-ast/assignment";
import { FunctionCall } from "~src/c-ast/functions";
import { Expression } from "~src/c-ast/core";
import { ArrayElementExpr, VariableExpr } from "~src/c-ast/variable";
import { WASM_ADDR_TYPE } from "~src/translator/memoryUtil";
import { arithmeticUnaryOperatorToInstruction } from "~src/translator/util";
import {
  convertConstantToWasmConst, convertScalarDataTypeToWasmType, getVariableAddr,
} from "~src/translator/variableUtil";
import {
  WasmFunctionCall,
  WasmRegularFunctionCall,
} from "~src/wasm-ast/functions";
import { WasmSymbolTable } from "./symbolTable";
import { MemoryVariableByteSize, WasmMemoryLoad, WasmMemoryStore } from "~src/wasm-ast/memory";
import { WasmModule, WasmExpression } from "~src/wasm-ast/core";
import { Constant } from "~src/c-ast/constants";
import { BinaryExpression } from "~src/c-ast/binaryExpression";
import { WasmBinaryExpression } from "~src/wasm-ast/expressions";
import translateBinaryExpression from "~src/translator/translateBinaryExpression";
import translateFunctionCall from "~src/translator/translateFunctionCall";
import { TranslationError, UnsupportedFeatureError, toJson } from "~src/errors";
import { isConstant } from "~src/common/utils";
import { getDataTypeSize } from "~src/processor/dataTypeUtil";
import { WasmIntegerConst } from "~src/wasm-ast/consts";
import translateUnaryExpression from "~src/translator/translateUnaryExpression";

/**
 * Evaluates a given C expression and returns the corresponding WASM expression.
 */
export default function translateExpression(
  wasmRoot: WasmModule,
  symbolTable: WasmSymbolTable,
  expr: Expression
): WasmExpression {
  if (isConstant(expr)) {
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
  } else if (expr.type === "VariableExpr") {
    const n = expr as VariableExpr;
    if (n.dataType.type === "primary" || n.dataType.type === "pointer") {
      return {
        type: "MemoryLoad",
        wasmDataType: convertScalarDataTypeToWasmType(n.dataType),
        addr: getVariableAddr(symbolTable, n.name),
        numOfBytes: getDataTypeSize(n.dataType) as MemoryVariableByteSize
      }
    } else if (n.dataType.type === "struct") {
      // TODO: when structs supported
      throw new UnsupportedFeatureError("Structs not yet supported in translation")
    } else if (n.dataType.type === "typedef") {
      // TODO: when typedef supported
      throw new UnsupportedFeatureError("Custom typedef types not yet supported in translation") 
    } else if (n.dataType.type === "array") {
      // arrays cannot be used as variable expressions
      throw new TranslationError("Arrays cannot be used as variable expression")
    } else {
      throw new TranslationError("translateExpression(): Unknown data type of variable expression")
    }
  } else if (expr.type === "ArrayElementExpr") {
    const n = expr as ArrayElementExpr;
    if (n.dataType.type !== "array") {
      throw new TranslationError(`translateExpression(): Invalid data type for array element expr: ${toJson(n.dataType)} - only arrays supported`)
    }
    return {
      type: "MemoryLoad",
      wasmDataType: n.dataType.elementDataType,
      numOfBytes: n.
      ...memoryAccessDetails,
    } as WasmMemoryLoad; 
  } else if (expr.type === "BinaryExpression") {
    const n = expr as BinaryExpression;
    return translateBinaryExpression(wasmRoot, symbolTable, n);
  } else if (expr.type === "PrefixArithmeticExpression") {
    const n: PrefixArithmeticExpression = expr as PrefixArithmeticExpression;
    const memoryAccessDetails = getMemoryAccessDetails(
      wasmRoot,
      symbolTable,
      n.variable
    );
    const wasmNode: WasmMemoryLoad = {
      type: "MemoryLoad",
      wasmDataType: memoryAccessDetails.wasmDataType,
      preStatements: [
        {
          type: "MemoryStore",
          wasmDataType: memoryAccessDetails.wasmDataType,
          value: {
            type: "BinaryExpression",
            instruction: arithmeticUnaryOperatorToInstruction(
              n.operator,
              n.variable.dataType
            ),
            wasmDataType: memoryAccessDetails.wasmDataType,
            leftExpr: {
              type: "MemoryLoad",
              ...memoryAccessDetails,
            } as WasmMemoryLoad,
            rightExpr: {
              type: "IntegerConst",
              wasmDataType: WASM_ADDR_TYPE,
              value: 1n,
            } as WasmIntegerConst,
          } as WasmBinaryExpression,
          ...memoryAccessDetails,
        },
      ],
      ...memoryAccessDetails,
    };
    return wasmNode;
  } else if (expr.type === "PostfixArithmeticExpression") {
    const n: PostfixArithmeticExpression = expr as PostfixArithmeticExpression;
    const memoryAccessDetails = getMemoryAccessDetails(
      wasmRoot,
      symbolTable,
      n.variable
    );
    const wasmNode: WasmMemoryStore = {
      type: "MemoryStore",
      value: {
        type: "BinaryExpression",
        instruction: arithmeticUnaryOperatorToInstruction(
          n.operator,
          n.variable.dataType
        ),
        wasmDataType: memoryAccessDetails.wasmDataType,
        leftExpr: {
          type: "MemoryLoad",
          ...memoryAccessDetails,
        },
        rightExpr: {
          type: "IntegerConst",
          wasmDataType: "i32",
          value: 1n,
        } as WasmIntegerConst,
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
  } else if (expr.type === "UnaryExpression") {
    const n = expr as UnaryExpression;
    return translateUnaryExpression(wasmRoot, symbolTable, n);
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
    } as WasmMemoryLoad;
  } else {
    console.assert(
      false,
      `WASM TRANSLATION ERROR: Unhandled C expression node\n${toJson(expr)}`
    );
  }
}
