/**
 * Definitions of various utility functions used for processing the C AST.
 */

import { ArithmeticExpression } from "~src/c-ast/arithmetic";
import { Constant, IntegerConstant } from "~src/c-ast/constants";
import { BinaryOperator } from "~src/common/constants";
import { IntegerType, VariableType } from "~src/common/types";
import { getVariableSize } from "~src/common/utils";
import { ProcessingError } from "~src/errors";

// Evaluates the value of a <operator> b
export function evaluateBinaryOperation(
  a: number,
  operator: BinaryOperator,
  b: number
) {
  switch (operator) {
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
  }
}

/**
 * Evaluates a constant arithmetic expression.
 */
export function evaluateConstantArithmeticExpression(
  sourceCode: string,
  arithmeticExpr: ArithmeticExpression
) {
  const arithmeticExpression = arithmeticExpr as ArithmeticExpression;
  if (arithmeticExpression.firstExpr.type !== "IntegerConstant") {
    throw new ProcessingError(
      "Error: Intializer element of global variable is not constant",
      sourceCode,
      arithmeticExpr.position
    );
  }
  let val = (arithmeticExpression.firstExpr as IntegerConstant).value;
  //evaluate the constant arithmetic expression
  for (const operand of arithmeticExpression.exprs) {
    if (operand.expr.type !== "IntegerConstant") {
      throw new ProcessingError(
        "Error: Intializer element of global variable is not constant",
        sourceCode,
        arithmeticExpr.position
      );
    }
    val = evaluateBinaryOperation(
      val,
      operand.operator,
      (operand.expr as IntegerConstant).value
    );
  }
  return {
    type: "IntegerConstant",
    variableType: "int", // TODO: change when support more vartypes
    value: val,
  } as IntegerConstant;
}

/**
 * Returns the maximum value of a signed int type.
 */
function getMaxValueOfSignedIntType(val: IntegerType) {
  return Math.pow(2, getVariableSize(val) * 8 - 1);
}

function getMinValueOfSignedIntType(val: IntegerType) {
  return -Math.pow(2, getVariableSize(val) * 8 - 1) - 1;
}

/**
 * Returns the type of a constant (like a literal number "123") as per 6.4.4.1 of C17 standard.
 * TODO: add unsigned ints.
 */
export function getVariableTypeOfConstant(constant: Constant): VariableType {
  if (constant.type === "FloatConstant") {
    // TODO: implement when floating types added
  }


  const c = constant as IntegerConstant;
  if (c.isUnsigned) {
    // TODO: implement when unsigned types are added
  }

  // signed integers only
  if (constant.value < 0) {
    // negative ints
    if (constant.value >= getMinValueOfSignedIntType("int")) {
      return "int";
    } else if (constant.value >= getMinValueOfSignedIntType("long")) {
      return "long";
    } else {
      // integer is too negative
      // TODO: possibly inform user with warning here
      return "long";
    }
  }

  if (constant.value <= getMaxValueOfSignedIntType("int")) {
    return "int";
  } else if (constant.value <= getMaxValueOfSignedIntType("long")) {
    return "long";
  } else {
    // integer is too large
    // TODO: possibly inform user with warning here
    return "long";
  }
}