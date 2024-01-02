import { Expression } from "~src/c-ast/core";
import { BinaryOperator, ScalarDataType } from "~src/common/types";

/**
 * Definition of a binary expression consisting of 2 expressions (operands) and 1 operand.
 */
export interface BinaryExpression extends Expression {
  type: "BinaryExpression";
  leftExpr: Expression;
  rightExpr: Expression;
  operator: BinaryOperator;
  dataType: ScalarDataType; // binary expressions should only have scalar types
}
