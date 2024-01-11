import { determineDataTypeOfBinaryExpression } from "./expressionUtil";
import processConstant, {
  getAdjustedIntValueAccordingToDataType,
} from "./processConstant";

import {
  BinaryOperator,
  UnaryOperator,
  IntegerDataType,
  FloatDataType,
} from "~src/common/types";
import { isIntegerType } from "~src/common/utils";
import { ProcessingError } from "~src/errors";
import { Expression } from "~src/parser/c-ast/core";
import { ConstantP } from "~src/processor/c-ast/expression/constants";

/**
 * Evaluates the result of the binary expression a <operator> b.
 */

export function performBinaryOperation<T extends number | bigint>(
  a: T,
  operator: BinaryOperator,
  b: T
): T;
export function performBinaryOperation(
  a: any,
  operator: BinaryOperator,
  b: any
) {
  switch (operator) {
    // arithmetic operators
    case "+":
      return a + b;
    case "-":
      return a - b;
    case "*":
      return a * b;
    case "/":
      return a / b;
    case "%":
      return a % b;
    // logical operators
    case "&&":
      return a !== 0 && b !== 0 ? 1 : 0;
    case "||":
      return a !== 0 || b !== 0 ? 1 : 0;
    // relational operator
    case "<":
      return a < b ? 1 : 0;
    case "<=":
      return a <= b ? 1 : 0;
    case "!=":
      return a !== b ? 1 : 0;
    case "==":
      return a === b ? 1 : 0;
    case ">=":
      return a >= b ? 1 : 0;
    case ">":
      return a > b ? 1 : 0;
    // bitwise binary operator
    case ">>":
      return a >> b;
    case "<<":
      return a << b;
    case "&":
      return a & b;
    case "|":
      return a | b;
    case "^":
      return a ^ b;
  }
}

export function performUnaryOperation<T extends number | bigint>(
  a: T,
  operator: UnaryOperator
): T;
export function performUnaryOperation(a: any, operator: UnaryOperator) {
  switch (operator) {
    // Arithmetic unary opreators
    case "++":
      return a + 1;
    case "--":
      return a - 1;
    // Prefix Operators
    case "!":
      return a === 0 ? 1 : 0;
    case "~":
      return ~a;
    case "-":
      return -a;
    case "+":
      return a;
  }
}
/**
 * Evaluates a compile time expression.
 */

export default function evaluateCompileTimeExpression(
  expr: Expression
): ConstantP {
  if (expr.type === "FloatConstant" || expr.type === "IntegerConstant") {
    // alerady a constant
    return processConstant(expr);
  } else if (expr.type === "BinaryExpression") {
    // binary expressions
    const evaluatedLeftExpr = evaluateCompileTimeExpression(expr.leftExpr);
    const evaluatedRightExpr = evaluateCompileTimeExpression(expr.rightExpr);
    let value = performBinaryOperation(
      evaluatedLeftExpr.value,
      expr.operator,
      evaluatedRightExpr.value
    );

    const dataType = determineDataTypeOfBinaryExpression(
      {type: "primary" , primaryDataType: evaluatedLeftExpr.dataType},
      {type: "primary", primaryDataType: evaluatedRightExpr.dataType},
      expr.operator
    );

    if (dataType.type !== "primary") {
      throw new ProcessingError("Invalid compile-time expression", expr.position)
    }

    if (isIntegerType(dataType.primaryDataType)) {
      // need to cap integer values correctly
      value = getAdjustedIntValueAccordingToDataType(value as bigint, dataType.primaryDataType);

      return {
        type: "IntegerConstant",
        dataType: dataType.primaryDataType as IntegerDataType,
        value,
      };
    } else {
      // the result of the binary expression is a floating point
      return {
        type: "FloatConstant",
        dataType: dataType.primaryDataType as FloatDataType,
        value: value as number,
      };
    }
  } else if (
    expr.type === "PrefixExpression" ||
    expr.type === "PostfixExpression"
  ) {
    // unary expressions
    const evaluatedExpr = evaluateCompileTimeExpression(expr.expr);
    const dataType = evaluatedExpr.dataType;
    let value = performUnaryOperation(evaluatedExpr.value, expr.operator);
    if (isIntegerType(dataType)) {
      // need to cap integer values correctly
      value = getAdjustedIntValueAccordingToDataType(value as bigint, dataType);

      return {
        type: "IntegerConstant",
        dataType: dataType as IntegerDataType,
        value,
      };
    } else {
      // the result of the binary expression is a floating point
      return {
        type: "FloatConstant",
        dataType: dataType as FloatDataType,
        value: value as number,
      };
    }
  } else {
    throw new ProcessingError(
      "Cannot evaluate non compile-time constant type at compile-time"
    );
  }
}
