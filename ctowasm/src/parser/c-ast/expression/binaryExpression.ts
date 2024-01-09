import { CNodeBase, Expression } from "~src/parser/c-ast/core";
import { BinaryOperator } from "~src/common/types";

/**
 * Definition of a binary expression consisting of 2 expressions (operands) and 1 operand.
 */
export interface BinaryExpression extends CNodeBase {
  type: "BinaryExpression";
  leftExpr: Expression;
  rightExpr: Expression;
  operator: BinaryOperator;
}
