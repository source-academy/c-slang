/**
 * This file contains various utility functions to help in checking the fulfillment of constraints of different language features.
 */

import { BinaryOperator } from "~src/common/types";
import { ProcessingError } from "~src/errors";
import { DataType } from "~src/parser/c-ast/dataTypes";
import { BinaryExpression } from "~src/parser/c-ast/expression/binaryExpression";
import {
  PostfixExpression,
  PrefixExpression,
} from "~src/parser/c-ast/expression/unaryExpression";
import { ExpressionWrapperP } from "~src/processor/c-ast/expression/expressions";
import {
  checkDataTypeCompatibility,
  isArithmeticDataType,
  isIntegralDataType,
  isNullPointerConstant,
  isPointer,
  isPointerToCompleteDataType,
  isRealDataType,
  isScalarDataType,
  isVoidPointer,
  stringifyDataType,
} from "~src/processor/dataTypeUtil";
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
      `wrong type argument to ${
        expression.operator === "++" ? "increment" : "decrement"
      }`
    );
  }

  if (!isModifiableLValue(expression.expr, dataType, symbolTable)) {
    throw new ProcessingError(
      `argument to ${
        expression.operator === "++" ? "increment" : "decrement"
      } is not a modifiable lvalue`
    );
  }
}

/**
 * Performs type checking on operands of a binary expression as per constraints found from 6.5.5 to 6.5.14 of the C17 standard.
 */
export function checkBinaryExpressionConstraints(
  binaryExpr: BinaryExpression,
  processedLeftExpr: ExpressionWrapperP,
  processedRightExpr: ExpressionWrapperP
) {
  const leftDataType = getDataTypeOfExpression({
    expression: processedLeftExpr,
    convertArrayToPointer: true,
    convertFunctionToPointer: true,
  });
  const rightDataType = getDataTypeOfExpression({
    expression: processedRightExpr,
    convertArrayToPointer: true,
    convertFunctionToPointer: true,
  });
  function throwBinaryExpressionInvalidOperandsError() {
    throw new ProcessingError(
      `invalid operands to binary '${
        binaryExpr.operator
      }' (have '${stringifyDataType(leftDataType)}' and '${stringifyDataType(
        rightDataType
      )}')`
    );
  }

  function checkBothOperandsHaveType(checker: (dataType: DataType) => boolean) {
    return checker(leftDataType) && checker(rightDataType);
  }

  function checkOperandsTypeCombination(
    checker1: (dataType: DataType) => boolean,
    checker2: (dataType: DataType) => boolean
  ) {
    return (
      (checker1(leftDataType) && checker2(rightDataType)) ||
      (checker2(leftDataType) && checker1(rightDataType))
    );
  }

  function checkPointerCompatibilityIgnoringQualifiers() {
    return (
      checkBothOperandsHaveType(isPointer) &&
      checkDataTypeCompatibility(leftDataType, rightDataType, true)
    );
  }

  switch (binaryExpr.operator) {
    case "*":
    case "/":
      if (!checkBothOperandsHaveType(isArithmeticDataType)) {
        throwBinaryExpressionInvalidOperandsError();
      }
      break;
    case "%":
      if (!checkBothOperandsHaveType(isIntegralDataType)) {
        throwBinaryExpressionInvalidOperandsError();
      }
      break;
    case "+":
      if (
        !(
          checkBothOperandsHaveType(isArithmeticDataType) ||
          checkOperandsTypeCombination(
            isPointerToCompleteDataType,
            isIntegralDataType
          )
        )
      ) {
        throwBinaryExpressionInvalidOperandsError();
      }
      break;
    case "-":
      if (
        !(
          checkBothOperandsHaveType(isArithmeticDataType) ||
          checkOperandsTypeCombination(
            isPointerToCompleteDataType,
            isIntegralDataType
          ) ||
          checkPointerCompatibilityIgnoringQualifiers()
        )
      ) {
        throwBinaryExpressionInvalidOperandsError();
      }
      break;
    case ">>":
    case "<<":
      if (!checkBothOperandsHaveType(isIntegralDataType)) {
        throwBinaryExpressionInvalidOperandsError();
      }
      break;
    case ">":
    case "<":
    case "<=":
    case ">=":
      if (
        !(
          checkBothOperandsHaveType(isRealDataType) ||
          checkPointerCompatibilityIgnoringQualifiers()
        )
      ) {
        throwBinaryExpressionInvalidOperandsError();
      }
      break;
    case "==":
    case "!=":
      if (
        !(
          checkBothOperandsHaveType(isArithmeticDataType) ||
          checkPointerCompatibilityIgnoringQualifiers() ||
          checkOperandsTypeCombination(isPointer, isVoidPointer) ||
          (isPointer(leftDataType) &&
            isNullPointerConstant(processedRightExpr)) ||
          (isPointer(rightDataType) && isNullPointerConstant(processedLeftExpr))
        )
      ) {
        throwBinaryExpressionInvalidOperandsError();
      }
      break;
    case "&":
    case "^":
    case "|":
      if (!checkBothOperandsHaveType(isIntegralDataType)) {
        throwBinaryExpressionInvalidOperandsError();
      }
      break;
    case "&&":
    case "||":
      if (!checkBothOperandsHaveType(isScalarDataType)) {
        throw throwBinaryExpressionInvalidOperandsError();
      }
  }
}
