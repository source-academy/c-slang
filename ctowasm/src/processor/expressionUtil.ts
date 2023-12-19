/**
 * Definitions of various utility functions used for processing the C AST expressions.
 */

import { Constant } from "~src/c-ast/constants";
import {
  BinaryOperator,
  SignedIntegerType,
  UnsignedIntegerType,
  VariableType,
} from "~src/common/types";
import {
  getVariableSize,
  isSignedIntegerType,
  isUnsignedIntegerType,
} from "~src/common/utils";
import { ProcessingError } from "~src/errors";
import { BinaryExpression } from "~src/c-ast/binaryExpression";
import { VariableExpr } from "~src/c-ast/variable";
import { ArrayElementExpr } from "~src/c-ast/arrays";
import { FunctionCall, FunctionCallStatement } from "~src/c-ast/functions";
import { ArraySymbolEntry, FunctionSymbolEntry, SymbolTable, VariableSymbolEntry } from "~src/c-ast/symbolTable";

// Evaluates the value of a <operator> b
export function evaluateBinaryExpression(
  a: number,
  operator: BinaryOperator,
  b: number,
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
    case "&&":
      return a !== 0 && b !== 0 ? 1 : 0;
    case "||":
      return a !== 0 || b !== 0 ? 1 : 0;
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
  }
}

/**
 * Evaluates a constant arithmetic expression.
 */
export function evaluateConstantBinaryExpression(
  binaryExpr: BinaryExpression | Constant,
): Constant {
  if (binaryExpr.type === "Constant") {
    // alerady a constant
    return binaryExpr;
  }

  if (binaryExpr.type !== "BinaryExpression") {
    throw new ProcessingError(
      `Processing Error: Unknown node being used as binary expression in evaluation of constant binary expressions: ${JSON.stringify(
        binaryExpr,
      )}`,
    );
  }

  // need to perform the appropriate truncation on the value if necessary as per C standard
  let value = evaluateBinaryExpression(
    evaluateConstantBinaryExpression(
      binaryExpr.leftExpr as BinaryExpression | Constant,
    ).value,
    binaryExpr.operator,
    evaluateConstantBinaryExpression(
      binaryExpr.rightExpr as BinaryExpression | Constant,
    ).value,
  );

  const variableType = determineVariableTypeOfBinaryExpression(binaryExpr);
  value = getAdjustedValueAccordingToVariableType(value, variableType);

  return {
    type: "Constant",
    variableType,
    value,
    position: binaryExpr.position,
  };
}

/**
 * Get the adjusted numeric value of a value according to its variable type, as per C standard.
 * Handles:
 * 1. Decimal removal for int types
 * 2. Wrap around for integer overflows
 *
 */
function getAdjustedValueAccordingToVariableType(
  value: number,
  variableType: VariableType,
) {
  let newValue = value;
  if (
    isSignedIntegerType(variableType) ||
    isUnsignedIntegerType(variableType)
  ) {
    // remove decimal
    newValue = Math.floor(newValue);
  }

  // handle integer overflows
  if (
    isSignedIntegerType(variableType) &&
    newValue > getMaxValueOfSignedIntType(variableType as SignedIntegerType)
  ) {
    newValue =
      newValue % getMaxValueOfSignedIntType(variableType as SignedIntegerType);
  } else if (
    isUnsignedIntegerType(variableType) &&
    newValue > getMaxValueOfUnsignedIntType(variableType as UnsignedIntegerType)
  ) {
    newValue =
      newValue %
      getMaxValueOfUnsignedIntType(variableType as UnsignedIntegerType);
  }

  return newValue;
}

/**
 * Returns the maximum value of a signed int type.
 */
function getMaxValueOfSignedIntType(val: SignedIntegerType) {
  return Math.pow(2, getVariableSize(val) * 8 - 1);
}

function getMinValueOfSignedIntType(val: SignedIntegerType) {
  return -Math.pow(2, getVariableSize(val) * 8 - 1) - 1;
}

function getMaxValueOfUnsignedIntType(val: UnsignedIntegerType) {
  return Math.pow(2, getVariableSize(val) * 8) - 1;
}

/**
 * Sets the variableType of a constant (like a literal number "123") as per 6.4.4.1 of C17 standard.
 * TODO: add unsigned ints.
 */
export function setVariableTypeOfConstant(constant: Constant): VariableType {
  // TODO: implement floating types

  const c = constant as Constant;
  if (c.isUnsigned) {
    // TODO: implement when unsigned types are added
    return;
  }

  // signed integers only
  if (constant.value < 0) {
    // negative ints
    if (constant.value >= getMinValueOfSignedIntType("signed int")) {
      constant.variableType = "signed int";
    } else if (constant.value >= getMinValueOfSignedIntType("signed long")) {
      constant.variableType = "signed long";
    } else {
      // integer is too negative
      // TODO: possibly inform user with warning here
      constant.variableType = "signed long";
    }
  } else {
    if (constant.value <= getMaxValueOfSignedIntType("signed int")) {
      constant.variableType = "signed int";
    } else if (constant.value <= getMaxValueOfSignedIntType("signed long")) {
      constant.variableType = "signed long";
    } else {
      // integer is too large
      // TODO: possibly inform user with warning here
      constant.variableType = "signed long";
    }
  }
}

/**
 * Returns the correct varaible type for a binary expression accorsinf to rules of arithemetic conversion 6.3.1.8 in C17 standard.
 * Follows integer promition rules for integral types. Promotion follows by size of the variable (larger size = higher rank)
 */
function determineVariableTypeOfBinaryExpression(
  binaryExpression: BinaryExpression,
): VariableType {
  if (
    getVariableSize(binaryExpression.rightExpr.variableType) >
    getVariableSize(binaryExpression.leftExpr.variableType)
  ) {
    return binaryExpression.rightExpr.variableType;
  } else {
    return binaryExpression.leftExpr.variableType;
  }
}

/**

 * TODO: add unsigned behaviour later.
 * TODO: add float handling later
 */
export function setVariableTypeOfBinaryExpression(
  binaryExpression: BinaryExpression,
) {
  binaryExpression.variableType =
    determineVariableTypeOfBinaryExpression(binaryExpression);
}

/**
 * Sets the variable type of any kind of expression that involves accessing a symbol.
 */
export function setVariableTypeOfSymbolAccessExpression(
  node: FunctionCall | VariableExpr | ArrayElementExpr,
  symbolTable: SymbolTable,
) {
  const symbolEntry = symbolTable.getSymbolEntry(node.name);
  if (symbolEntry.type === "function") {
    const s = symbolEntry as FunctionSymbolEntry;
    node.variableType = s.returnType;
  } else {
    const s = symbolEntry as VariableSymbolEntry | ArraySymbolEntry;
    node.variableType = s.variableType;
  }
}
