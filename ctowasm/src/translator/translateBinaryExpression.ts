/**
 * Translate a binary expression into corresponding WAT AST nodes based on operator.
 */

import { BinaryExpression } from "~src/parser/c-ast/binaryExpression";
import { BinaryOperator } from "~src/common/types";
import { ScalarDataType } from "~src/processor/c-ast/dataTypes";
import {
  isUnsignedIntegerType,
  isSignedIntegerType,
  isScalarType,
} from "~src/common/utils";
import translateExpression from "~src/translator/translateExpression";
import {
  convertScalarDataTypeToWasmType,
  getTypeConversionWrapper,
} from "~src/translator/variableUtil";
import { WasmBinaryExpression } from "~src/wasm-ast/expressions";
import { WasmModule } from "~src/wasm-ast/core";
import { WasmSymbolTable } from "./symbolTable";
import { TranslationError } from "~src/errors";

export default function translateBinaryExpression(
  wasmRoot: WasmModule,
  symbolTable: WasmSymbolTable,
  binaryExpr: BinaryExpression
): WasmBinaryExpression {
  // binary expressions only work on scalar types
  if (
    !isScalarType(binaryExpr.leftExpr.dataType) ||
    !isScalarType(binaryExpr.rightExpr.dataType)
  ) {
    // these operators can only run on scalar type
    throw new TranslationError(
      `translateBinaryExpression(): Non-scalar type used for ${binaryExpr.operator}`
    );
  }

  const leftExprDataType = binaryExpr.dataType as ScalarDataType;
  const rightExprDataType = binaryExpr.dataType as ScalarDataType;

  // special handling for && and || since wasm does not have native instructions for these operations
  if (binaryExpr.operator === "&&" || binaryExpr.operator === "||") {
    // need to convert the left and right expr to boolean expression (1 or 0) before doing bitwise AND or OR
    return {
      type: "BinaryExpression",
      leftExpr: {
        type: "BooleanExpression",
        expr: translateExpression(wasmRoot, symbolTable, binaryExpr.leftExpr),
        wasmDataType: convertScalarDataTypeToWasmType(leftExprDataType),
      },
      rightExpr: {
        type: "BooleanExpression",
        expr: translateExpression(wasmRoot, symbolTable, binaryExpr.rightExpr),
        wasmDataType: convertScalarDataTypeToWasmType(rightExprDataType),
      },
      instruction: getBinaryExpressionInstruction(
        binaryExpr.operator,
        binaryExpr.dataType as ScalarDataType
      ),
      wasmDataType: "i32", // i32 since its just a boolean
    } as WasmBinaryExpression;
  }

  return {
    type: "BinaryExpression",
    // perform implicit arithmetic type conversions
    leftExpr: getTypeConversionWrapper(
      leftExprDataType,
      binaryExpr.dataType,
      translateExpression(wasmRoot, symbolTable, binaryExpr.leftExpr)
    ),
    rightExpr: getTypeConversionWrapper(
      rightExprDataType,
      binaryExpr.dataType,
      translateExpression(wasmRoot, symbolTable, binaryExpr.rightExpr)
    ),
    instruction: getBinaryExpressionInstruction(
      binaryExpr.operator,
      binaryExpr.dataType
    ),
    wasmDataType: convertScalarDataTypeToWasmType(binaryExpr.dataType),
  } as WasmBinaryExpression;
}

const binaryOperatorToInstructionMap: Record<BinaryOperator, string> = {
  "+": "add",
  "-": "sub",
  "*": "mul",
  "/": "div",
  "%": "rem",
  "<": "lt",
  "<=": "le",
  "!=": "ne",
  "==": "eq",
  ">=": "ge",
  ">": "gt",
  "&&": "and",
  "||": "or",
  "&": "and",
  "|": "or",
  "<<": "shl",
  ">>": "shr",
  "^": "xor",
};

const signedUnsignedVariantOps = ["div", "rem", "lt", "le", "gt", "ge", "shr"];

function isOperationWithUnsignedSignedVariant(op: string) {
  return signedUnsignedVariantOps.includes(op);
}

/**
 * Returns the correct WAT binary instruction, given a binary operator.
 * Takes the dataType into account, as certain integer operations have signed and unsigned variant.
 */
export function getBinaryExpressionInstruction(
  operator: BinaryOperator,
  dataType: ScalarDataType
) {
  const createBinaryInstruction = (op: string) => {
    const instruction = `${convertScalarDataTypeToWasmType(dataType)}.${op}`;
    if (isOperationWithUnsignedSignedVariant(op)) {
      // these instructions have unsigned vs signed variants for integers
      if (isUnsignedIntegerType(dataType)) {
        return instruction + "_u";
      }

      if (isSignedIntegerType(dataType)) {
        return instruction + "_s";
      }

      // floats have no sign prefix
      return instruction;
    }

    return instruction;
  };

  return createBinaryInstruction(binaryOperatorToInstructionMap[operator]);
}
