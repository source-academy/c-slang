import { BinaryOperator } from "~src/c-ast/arithmetic";

// Evaluates the value of a <operator> b
export function evaluateConstantArithmeticExpression(
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