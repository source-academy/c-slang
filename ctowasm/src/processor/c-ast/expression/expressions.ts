import { BinaryOperator, ScalarCDataType } from "~src/common/types";
import { DataType } from "~src/parser/c-ast/dataTypes";
import {
  ExpressionP,
  StatementP,
  ExpressionPBase,
} from "~src/processor/c-ast/core";

export interface BinaryExpressionP extends ExpressionPBase {
  type: "BinaryExpression";
  leftExpr: ExpressionP;
  rightExpr: ExpressionP;
  operator: BinaryOperator;
  operandTargetDataType: ScalarCDataType; // the data type to convert the operands to before the binary operation
}

export interface UnaryExpressionP extends ExpressionPBase {
  type: "UnaryExpression";
  operator: "-" | "~" | "!"; // only these operators will be handled in this node. Others are handled in other ways.
  expr: ExpressionP;
}

/**
 * Represents an expression that consists of a series of statements followed by a expression
 * Used as the result of processing assignment expressions.
 */
export interface PreStatementExpressionP extends ExpressionPBase {
  type: "PreStatementExpression";
  statements: StatementP[];
  expr: ExpressionP;
}

/**
 * Represents an expression that consists of a primary expression followed by a sequence of statements.
 * Used as the result of processing postfix expressions.
 */
export interface PostStatementExpressionP extends ExpressionPBase {
  type: "PostStatementExpression";
  statements: StatementP[];
  expr: ExpressionP;
}

/**
 * Represents a inline conditional expression e.g: 1 ? 2 : 3
 */
export interface ConditionalExpressionP extends ExpressionPBase {
  type: "ConditionalExpression";
  condition: ExpressionP;
  trueExpression: ExpressionP; // expression to return if condition is not zero (true)
  falseExpression: ExpressionP;
}

/**
 * A wrapper for the result of processing expressions, to be used by the processor only (not present in generated AST)
 */
export interface ExpressionWrapperP {
  originalDataType: DataType;
  exprs: ExpressionP[]; // the resultant processed ExpressionP
}
