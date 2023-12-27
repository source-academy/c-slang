/**
 * Translate a binary expression into corresponding WAT AST nodes based on operator.
 */

import { BinaryExpression } from "~src/c-ast/binaryExpression";
import { BinaryOperator, VariableType } from "~src/common/types";
import { isUnsignedIntegerType, isSignedIntegerType } from "~src/common/utils";
import translateExpression from "~src/translator/translateExpression";
import {
  getTypeConversionWrapper,
  variableTypeToWasmType,
} from "~src/translator/variableUtil";
import { WasmBinaryExpression } from "~src/wasm-ast/expressions";
import { WasmModule } from "~src/wasm-ast/core";
import { WasmSymbolTable } from "~src/wasm-ast/functions";
import { WasmBooleanExpression } from "~src/wasm-ast/misc";

export default function translateBinaryExpression(
  wasmRoot: WasmModule,
  symbolTable: WasmSymbolTable,
  binaryExpr: BinaryExpression
): WasmBinaryExpression {
  // special handling for && and || since wasm does not have native instructions for these operations
  if (binaryExpr.operator === "&&" || binaryExpr.operator === "||") {
    // need to convert the left and right expr to boolean expression (1 or 0) before doing bitwise AND or OR
    return {
      type: "BinaryExpression",
      leftExpr: {
        type: "BooleanExpression",
        expr: translateExpression(wasmRoot, symbolTable, binaryExpr.leftExpr),
      } as WasmBooleanExpression,
      rightExpr: {
        type: "BooleanExpression",
        expr: translateExpression(wasmRoot, symbolTable, binaryExpr.rightExpr),
      } as WasmBooleanExpression,
      instruction: getBinaryExpressionInstruction(
        binaryExpr.operator,
        binaryExpr.variableType
      ),
      wasmVariableType: "i32", // i32 since its just a boolean
    } as WasmBinaryExpression;
  }

  return {
    type: "BinaryExpression",
    // perform implicit arithmetic type conversions
    leftExpr: getTypeConversionWrapper(
      binaryExpr.leftExpr.variableType,
      binaryExpr.variableType,
      translateExpression(wasmRoot, symbolTable, binaryExpr.leftExpr)
    ),
    rightExpr: getTypeConversionWrapper(
      binaryExpr.rightExpr.variableType,
      binaryExpr.variableType,
      translateExpression(wasmRoot, symbolTable, binaryExpr.rightExpr)
    ),
    instruction: getBinaryExpressionInstruction(
      binaryExpr.operator,
      binaryExpr.variableType
    ),
    wasmVariableType: variableTypeToWasmType[binaryExpr.variableType],
  };
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
 * Takes the variableType into account, as certain integer operations have signed and unsigned variant.
 */
export function getBinaryExpressionInstruction(
  operator: BinaryOperator,
  variableType: VariableType
) {
  const createBinaryInstruction = (op: string) => {
    const instruction = `${variableTypeToWasmType[variableType]}.${op}`;
    if (isOperationWithUnsignedSignedVariant(op)) {
      // these instructions have unsigned vs signed variants for integers
      if (isUnsignedIntegerType(variableType)) {
        return instruction + "_u";
      }

      if (isSignedIntegerType(variableType)) {
        return instruction + "_s";
      }

      // floats have no sign prefix
      return instruction;
    }

    return instruction;
  };

  return createBinaryInstruction(binaryOperatorToInstructionMap[operator]);
}
