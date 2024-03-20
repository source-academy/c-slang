/**
 * This file contains various utility functions to help in checking the fulfillment of constraints of different language features.
 */

import { PostfixExpression } from "~dist";
import { ProcessingError } from "~src/errors";
import { PrefixExpression } from "~src/parser/c-ast/expression/unaryExpression";
import { ExpressionWrapperP } from "~src/processor/c-ast/expression/expressions";
import { isScalarDataType } from "~src/processor/dataTypeUtil";
import { isModifiableLValue } from "~src/processor/lvalueUtil";
import { SymbolTable } from "~src/processor/symbolTable";
import { getDataTypeOfExpression } from "~src/processor/util";

/**
 * Checks if given expression and its result after processing fulfills pre or postfix type constraint.
 * Constraint 6.5.2.4/1 of C17 standard.
 */
export function checkPrePostfixTypeConstraint(
  expression: PrefixExpression | PostfixExpression,
  processedUnderlyingExpr: ExpressionWrapperP,
  symbolTable: SymbolTable
) {
  const dataType = getDataTypeOfExpression({
    expression: processedUnderlyingExpr,
  });
  // must be real or pointer type and be modifiable lvalue
  if (!isScalarDataType(dataType)) {
    throw new ProcessingError(
      `wrong type argument to ${expression.operator === "++" ? "increment" : "decrement"}`
    );
  }

  if (!isModifiableLValue(expression.expr, dataType, symbolTable)) {
    throw new ProcessingError(`argument to ${expression.operator === "++" ? "increment" : "decrement"} is not a modifiable lvalue`);
  }
}
