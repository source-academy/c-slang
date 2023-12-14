/**
 * Definitions of various utility functions used for processing the C AST.
 */

import { ArithmeticExpression } from "~src/c-ast/arithmetic";
import { IntegerConstant } from "~src/c-ast/constants";
import { BinaryOperator } from "~src/common/constants";
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
