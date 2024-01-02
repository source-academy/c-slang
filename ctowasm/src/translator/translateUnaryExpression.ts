/**
 * Definition of function to handle unary expressions
 */

import { UnaryExpression } from "~src/c-ast/unaryExpression";
import { isFloatType, isIntegerType } from "~src/common/utils";
import { TranslationError } from "~src/errors";
import translateExpression from "~src/translator/translateExpression";
import { getMaxIntConstant } from "~src/translator/util";
import { primaryCDataTypeToWasmType } from "~src/translator/variableUtil";
import { WasmIntegerConst } from "~src/wasm-ast/consts";
import { WasmExpression, WasmModule } from "~src/wasm-ast/core";
import {
  WasmBinaryExpression,
  WasmNegateFloatExpression,
} from "~src/wasm-ast/expressions";
import { WasmSymbolTable } from "./symbolTable";
import { WasmBooleanExpression } from "~src/wasm-ast/misc";

/**
 * Translates a UnaryExpression into the nodes for that expression,
 * depedning on the expression dataType and operator.
 */
export default function translateUnaryExpression(
  wasmRoot: WasmModule,
  symbolTable: WasmSymbolTable,
  unaryExpr: UnaryExpression
): WasmExpression {
  if (unaryExpr.operator === "-") {
    if (isIntegerType(unaryExpr.dataType)) {
      const node: WasmBinaryExpression = {
        type: "BinaryExpression",
        instruction: "sub",
        leftExpr: getMaxIntConstant(
          primaryCDataTypeToWasmType[unaryExpr.dataType] as "i32" | "i64"
        ),
        rightExpr: translateExpression(
          wasmRoot,
          symbolTable,
          unaryExpr.expression
        ),
        wasmDataType: primaryCDataTypeToWasmType[unaryExpr.dataType],
      };
      return node;
    } else if (isFloatType(unaryExpr.dataType)) {
      const node: WasmNegateFloatExpression = {
        type: "NegateFloatExpression",
        wasmDataType: primaryCDataTypeToWasmType[unaryExpr.dataType] as
          | "f32"
          | "f64",
        expr: translateExpression(wasmRoot, symbolTable, unaryExpr.expression),
      };
      return node;
    }
  } else if (unaryExpr.operator === "!") {
    const node: WasmBooleanExpression = {
      type: "BooleanExpression",
      wasmDataType: "i32",
      expr: translateExpression(wasmRoot, symbolTable, unaryExpr.expression),
      isNegated: true,
    };
    return node;
  } else if (unaryExpr.operator === "~") {
    if (!isIntegerType(unaryExpr.dataType)) {
      // bitwise complement is undefined on non integral types
      throw new TranslationError(
        `Wrong type argument to bitwise-complement - type used: ${unaryExpr.dataType}`
      );
    }

    const node: WasmBinaryExpression = {
      type: "BinaryExpression",
      leftExpr: {
        type: "IntegerConst",
        wasmDataType: primaryCDataTypeToWasmType[unaryExpr.dataType],
        value: -1n,
      } as WasmIntegerConst,
      rightExpr: translateExpression(
        wasmRoot,
        symbolTable,
        unaryExpr.expression
      ),
      wasmDataType: primaryCDataTypeToWasmType[unaryExpr.dataType],
      instruction: `${primaryCDataTypeToWasmType[unaryExpr.dataType]}.xor`,
    };
    return node;
  } else {
    throw new TranslationError(
      `translateUnaryExpression error: unknown unary operator: ${unaryExpr.operator}`
    );
  }
}
