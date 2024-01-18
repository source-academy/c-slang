/**
 * Translate a binary expression into corresponding WAT AST nodes based on operator.
 */

import { BinaryOperator, ScalarCDataType } from "~src/common/types";
import { ScalarDataType } from "~src/parser/c-ast/dataTypes";
import { isUnsignedIntegerType, isSignedIntegerType } from "~src/common/utils";
import { isScalarType } from "~src/processor/dataTypeUtil";
import translateExpression from "~src/translator/translateExpression";
import { getTypeConversionWrapper } from "./dataTypeUtil";
import { convertScalarDataTypeToWasmType } from "./dataTypeUtil";
import { WasmBinaryExpression } from "~src/translator/wasm-ast/expressions";
import { WasmModule } from "~src/translator/wasm-ast/core";
import { TranslationError } from "~src/errors";
import { BinaryExpressionP } from "~src/processor/c-ast/expression/expressions";
import { EnclosingLoopDetails } from "~src/translator/loopUtil";

export default function translateBinaryExpression(
  binaryExpr: BinaryExpressionP,
  enclosingLoopDetails?: EnclosingLoopDetails
): WasmBinaryExpression {
  // special handling for && and || since wasm does not have native instructions for these operations
  if (binaryExpr.operator === "&&" || binaryExpr.operator === "||") {
    // need to convert the left and right expr to boolean expression (1 or 0) before doing bitwise AND or OR
    return {
      type: "BinaryExpression",
      leftExpr: {
        type: "BooleanExpression",
        expr: translateExpression(
          binaryExpr.leftExpr,
          binaryExpr.leftExpr.dataType,
          enclosingLoopDetails
        ),
        wasmDataType: convertScalarDataTypeToWasmType(
          binaryExpr.leftExpr.dataType
        ),
      },
      rightExpr: {
        type: "BooleanExpression",
        expr: translateExpression(
          binaryExpr.rightExpr,
          binaryExpr.rightExpr.dataType,
          enclosingLoopDetails
        ),
        wasmDataType: convertScalarDataTypeToWasmType(
          binaryExpr.rightExpr.dataType
        ),
      },
      instruction: getBinaryExpressionInstruction(
        binaryExpr.operator,
        binaryExpr.dataType
      ),
    };
  }

  return {
    type: "BinaryExpression",
    // perform implicit arithmetic type conversions
    leftExpr: translateExpression(
      binaryExpr.leftExpr,
      binaryExpr.dataType,
      enclosingLoopDetails
    ),
    rightExpr: translateExpression(
      binaryExpr.rightExpr,
      binaryExpr.dataType,
      enclosingLoopDetails
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
  dataType: ScalarCDataType
) {
  const op = binaryOperatorToInstructionMap[operator];

  const instruction = `${convertScalarDataTypeToWasmType(dataType)}.${op}`;
  if (isOperationWithUnsignedSignedVariant(op)) {
    // these instructions have unsigned vs signed variants for integers
    if (isUnsignedIntegerType(dataType) || dataType === "pointer") {
      return instruction + "_u";
    }

    if (isSignedIntegerType(dataType)) {
      return instruction + "_s";
    }

    // floats have no sign prefix
    return instruction;
  }

  return instruction;
}
