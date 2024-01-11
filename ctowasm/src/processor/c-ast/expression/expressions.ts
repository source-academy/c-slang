import { BinaryOperator, PrefixOperator } from "~src/common/types";
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
}

export interface UnaryExpressionP extends ExpressionPBase {
  type: "UnaryExpression";
  operator: PrefixOperator;
  expr: ExpressionP;
}

/**
 * Wrapper node that indicates that the wrapped expression is to be treated as a boolean (int that is 1 or 0)
 */
export interface BooleanExpressionP extends ExpressionPBase {
  type: "BooleanExpression";
  expr: ExpressionP;
  dataType: "signed int";
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
 * A wrapper for the result of processing expressions, to be used by the processor only (not present in generated AST)
 */
export interface ExpressionWrapperP {
  originalDataType: DataType;
  exprs: ExpressionP[] // the resultant processed ExpressionP
}