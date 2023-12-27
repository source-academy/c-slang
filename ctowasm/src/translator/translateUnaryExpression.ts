/**
 * Definition of function to handle unary expressions
 */

import { UnaryExpression } from "~src/c-ast/unaryExpression";
import { isFloatType, isIntegerType } from "~src/common/utils";
import { TranslationError } from "~src/errors";
import translateExpression from "~src/translator/translateExpression";
import { getMaxIntConstant } from "~src/translator/util";
import { variableTypeToWasmType } from "~src/translator/variableUtil";
import { WasmIntegerConst } from "~src/wasm-ast/consts";
import { WasmExpression, WasmModule } from "~src/wasm-ast/core";
import { WasmBinaryExpression, WasmNegateFloatExpression } from "~src/wasm-ast/expressions";
import { WasmSymbolTable } from "~src/wasm-ast/functions";
import { WasmBooleanExpression } from "~src/wasm-ast/misc";


/**
 * Translates a UnaryExpression into the nodes for that expression,
 * depedning on the expression variableType and operator.
 */
export default function translateUnaryExpression(
  wasmRoot: WasmModule,
  symbolTable: WasmSymbolTable,
  unaryExpr: UnaryExpression
): WasmExpression {
  if (unaryExpr.operator === "-") {
    if (isIntegerType(unaryExpr.variableType)) {
      const node: WasmBinaryExpression = {
        type: "BinaryExpression",
        instruction: "sub",
        leftExpr: getMaxIntConstant(variableTypeToWasmType[unaryExpr.variableType] as "i32" | "i64"),
        rightExpr: translateExpression(wasmRoot, symbolTable, unaryExpr.expression),
        wasmVariableType: variableTypeToWasmType[unaryExpr.variableType]
      }
      return node;
    } else if (isFloatType(unaryExpr.variableType)) {
      const node: WasmNegateFloatExpression = {
        type: "NegateFloatExpression",
        wasmVariableType: variableTypeToWasmType[unaryExpr.variableType] as "f32" | "f64",
        expr: translateExpression(wasmRoot, symbolTable, unaryExpr.expression)
      }
      return node;
    }
  } else if (unaryExpr.operator === "!") {
    const node: WasmBooleanExpression = {
      type: "BooleanExpression",
      wasmVariableType: "i32",
      expr: translateExpression(wasmRoot, symbolTable, unaryExpr.expression),
      isNegated: true
    }
    return node;
  } else if (unaryExpr.operator === "~") {
    if (!isIntegerType(unaryExpr.variableType)) {
      // bitwise complement is undefined on non integral types
      throw new TranslationError(`Wrong type argument to bitwise-complement - type used: ${unaryExpr.variableType}`)
    }

    const node: WasmBinaryExpression = {
      type: "BinaryExpression",
      leftExpr: {
        type: "IntegerConst",
        wasmVariableType: variableTypeToWasmType[unaryExpr.variableType],
        value: -1n
      } as WasmIntegerConst,
      rightExpr: translateExpression(wasmRoot, symbolTable, unaryExpr.expression),
      wasmVariableType: variableTypeToWasmType[unaryExpr.variableType],
      instruction: `${variableTypeToWasmType[unaryExpr.variableType]}.xor`
    }
    return node;
  } else {
    throw new TranslationError(`translateUnaryExpression error: unknown unary operator: ${unaryExpr.operator}`);
  }
}