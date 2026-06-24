/**
 * Defines functions for evaluating C AST expression nodes and converting them to corresponding WAT AST nodes.
 */

import { POINTER_TYPE, WASM_ADDR_SIZE } from "~src/common/constants";
import { ScalarCDataType } from "~src/common/types";
import { getSizeOfScalarDataType } from "~src/common/utils";
import { TranslationError, toJson } from "~src/errors";
import { ExpressionP } from "~src/processor/c-ast/core";
import {
  convertConstantToWasmConst,
  convertScalarDataTypeToWasmType,
  getTypeConversionWrapper,
} from "~src/translator/dataTypeUtil";
import { EnclosingLoopDetails } from "~src/translator/loopUtil";
import {
  basePointerGetNode,
  getRegisterPointerArithmeticNode,
} from "~src/translator/memoryUtil";
import translateBinaryExpression, {
  getBinaryExpressionInstruction,
} from "~src/translator/translateBinaryExpression";
import translateStatement from "~src/translator/translateStatement";
import translateUnaryExpression from "~src/translator/translateUnaryExpression";
import { createWasmBooleanExpression } from "~src/translator/util";
import { WasmExpression } from "~src/translator/wasm-ast/core";

/**
 * Evaluates a given C expression and returns the corresponding WASM expression.
 */
export default function translateExpression(
  expr: ExpressionP,
  targetType: ScalarCDataType, // the wasm type that is expected for the result of this expression
  enclosingLoopDetails?: EnclosingLoopDetails,
): WasmExpression {
  function translateExpressionHelper(): WasmExpression {
    if (expr.type === "BinaryExpression") {
      return translateBinaryExpression(expr, enclosingLoopDetails);
    } else if (
      expr.type === "IntegerConstant" ||
      expr.type === "FloatConstant"
    ) {
      return convertConstantToWasmConst(expr);
    } else if (expr.type === "PreStatementExpression") {
      const translatedStatements = expr.statements.map((statement) =>
        translateStatement(statement, enclosingLoopDetails),
      );
      const translatedExpr = translateExpression(
        expr.expr,
        expr.expr.dataType,
        enclosingLoopDetails,
      );
      return {
        type: "PreStatementExpression",
        statements: expr.statements.map((statement) =>
          translateStatement(statement, enclosingLoopDetails),
        ),
        expr: translateExpression(
          expr.expr,
          expr.expr.dataType,
          enclosingLoopDetails,
        ),
      };
    } else if (expr.type === "PostStatementExpression") {
      return {
        type: "PostStatementExpression",
        statements: expr.statements.map((statement) =>
          translateStatement(statement, enclosingLoopDetails),
        ),
        expr: translateExpression(
          expr.expr,
          expr.expr.dataType,
          enclosingLoopDetails,
        ),
      };
    } else if (expr.type === "UnaryExpression") {
      return translateUnaryExpression(expr, enclosingLoopDetails);
    } else if (expr.type === "DataSegmentAddress") {
      // since data segment starts at memory address 0, simply return the offset expression
      return translateExpression(
        expr.offset,
        expr.offset.dataType,
        enclosingLoopDetails,
      );
    } else if (expr.type === "LocalAddress") {
      // the locals start at BP
      return {
        type: "BinaryExpression",
        leftExpr: basePointerGetNode,
        rightExpr: translateExpression(
          expr.offset,
          expr.offset.dataType,
          enclosingLoopDetails,
        ),
        instruction: getBinaryExpressionInstruction("+", "pointer"),
      };
    } else if (expr.type === "DynamicAddress") {
      return translateExpression(
        expr.address,
        expr.address.dataType,
        enclosingLoopDetails,
      );
    } else if (expr.type === "ReturnObjectAddress") {
      if (expr.subtype === "store") {
        return getRegisterPointerArithmeticNode(
          "bp",
          "+",
          WASM_ADDR_SIZE + Number(expr.offset.value),
        );
      } else {
        return getRegisterPointerArithmeticNode(
          "sp",
          "+",
          Number(expr.offset.value),
        );
      }
    } else if (expr.type === "MemoryLoad") {
      return {
        type: "MemoryLoad",
        addr: translateExpression(
          expr.address,
          expr.address.dataType,
          enclosingLoopDetails,
        ),
        wasmDataType: convertScalarDataTypeToWasmType(expr.dataType),
        numOfBytes: getSizeOfScalarDataType(expr.dataType),
      };
    } else if (expr.type === "ConditionalExpression") {
      return {
        type: "ConditionalExpression",
        condition: createWasmBooleanExpression(expr.condition),
        trueExpression: translateExpression(
          expr.trueExpression,
          expr.dataType,
          enclosingLoopDetails,
        ),
        falseExpression: translateExpression(
          expr.falseExpression,
          expr.dataType,
          enclosingLoopDetails,
        ),
        wasmDataType: convertScalarDataTypeToWasmType(expr.dataType),
      };
    } else if (expr.type === "FunctionTableIndex") {
      return translateExpression(
        expr.index,
        POINTER_TYPE,
        enclosingLoopDetails,
      ); // translate the underlying integer constant
    } else {
      throw new TranslationError(`Unhandled expression: ${toJson(expr)}`);
    }
  }

  // add any type conversion wrapper on the WasmExpression node if needed
  return getTypeConversionWrapper(
    expr.dataType,
    targetType,
    translateExpressionHelper(),
  );
}
