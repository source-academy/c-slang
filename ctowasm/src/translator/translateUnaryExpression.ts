/**
 * Definition of function to handle unary expressions
 */

import { isFloatType, isIntegerType } from "~src/common/utils";
import { TranslationError } from "~src/errors";
import translateExpression from "~src/translator/translateExpression";
import { getMaxIntConstant } from "~src/translator/util";
import { convertScalarDataTypeToWasmType, priamryCDataTypeToWasmType } from "./dataTypeUtil";
import { WasmExpression } from "~src/translator/wasm-ast/core";

import { UnaryExpressionP } from "~src/processor/c-ast/expression/expressions";
import { EnclosingLoopDetails } from "~src/translator/loopUtil";

/**
 * Translates a UnaryExpression into the nodes for that expression,
 * depedning on the expression dataType and operator.
 */
export default function translateUnaryExpression(
  unaryExpr: UnaryExpressionP,
  enclosingLoopDetails?: EnclosingLoopDetails
): WasmExpression {
  if (unaryExpr.operator === "-") {
    if (isIntegerType(unaryExpr.dataType)) {
      return {
        type: "BinaryExpression",
        instruction: "sub",
        leftExpr: getMaxIntConstant(
          convertScalarDataTypeToWasmType(unaryExpr.dataType) as "i32" | "i64"
        ),
        rightExpr: translateExpression(unaryExpr.expr, unaryExpr.dataType, enclosingLoopDetails),
      };
    } else if (isFloatType(unaryExpr.dataType)) {
      return {
        type: "NegateFloatExpression",
        wasmDataType: convertScalarDataTypeToWasmType(unaryExpr.dataType) as
          | "f32"
          | "f64",
        expr: translateExpression(unaryExpr.expr, unaryExpr.dataType, enclosingLoopDetails),
      };
    } else {
      throw new TranslationError(
        "'-' prefix operator is only valid on arithmetic types"
      );
    }
  } else if (unaryExpr.operator === "!") {
    return {
      type: "BooleanExpression",
      wasmDataType: "i32",
      expr: translateExpression(unaryExpr.expr, unaryExpr.dataType, enclosingLoopDetails),
      isNegated: true,
    };
  } else if (unaryExpr.operator === "~") {
    if (!isIntegerType(unaryExpr.dataType)) {
      // bitwise complement is undefined on non integral types
      throw new TranslationError(
        `Wrong type argument to bitwise-complement - type used: ${unaryExpr.dataType}`
      );
    }

    return {
      type: "BinaryExpression",
      leftExpr: {
        type: "IntegerConst",
        wasmDataType: convertScalarDataTypeToWasmType(unaryExpr.dataType) as
          | "i32"
          | "i64",
        value: -1n,
      },
      rightExpr: translateExpression(unaryExpr.expr, unaryExpr.dataType, enclosingLoopDetails),
      instruction: `${convertScalarDataTypeToWasmType(unaryExpr.dataType)}.xor`,
    };
  } else {
    throw new TranslationError(
      `translateUnaryExpression error: unknown unary operator: ${unaryExpr.operator}`
    );
  }
}
