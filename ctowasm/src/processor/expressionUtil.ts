/**
 * Definitions of various utility functions used for processing the C AST expressions.
 */

import { Constant } from "~src/c-ast/constants";
import {
  BinaryOperator,
  IntegerType,
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
import { FunctionCall } from "~src/c-ast/functions";
import {
  ArraySymbolEntry,
  FunctionSymbolEntry,
  SymbolTable,
  VariableSymbolEntry,
} from "~src/c-ast/symbolTable";

// Evaluates the value of a <operator> b
export function evaluateBinaryExpression(
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
  binaryExpr: BinaryExpression | Constant
): Constant {
  if (binaryExpr.type === "Constant") {
    // alerady a constant
    return binaryExpr;
  }

  if (binaryExpr.type !== "BinaryExpression") {
    throw new ProcessingError(
      `Processing Error: Unknown node being used as binary expression in evaluation of constant binary expressions: ${JSON.stringify(
        binaryExpr
      )}`
    );
  }

  // need to perform the appropriate truncation on the value if necessary as per C standard
  let value = evaluateBinaryExpression(
    evaluateConstantBinaryExpression(
      binaryExpr.leftExpr as BinaryExpression | Constant
    ).value,
    binaryExpr.operator,
    evaluateConstantBinaryExpression(
      binaryExpr.rightExpr as BinaryExpression | Constant
    ).value
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
  variableType: VariableType
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
  return Math.pow(2, getVariableSize(val) * 8 - 1) - 1;
}

function getMinValueOfSignedIntType(val: SignedIntegerType) {
  return -Math.pow(2, getVariableSize(val) * 8 - 1);
}

function getMaxValueOfUnsignedIntType(val: UnsignedIntegerType) {
  return Math.pow(2, getVariableSize(val) * 8) - 1;
}

/**
 * Logic for handling when the value of a constant is a very negative number that lies out of a range of a maxNegativeValue.
 * This, according to the standard, is signed integer overflow which is undefined. Thus the logic here is specific to this compiler
 * implementation, and is made to function similarly to other compilers.
 */
function capNegativeValue(value: number, integerType: IntegerType) {
  const minNegativeValue = -Math.pow(2, getVariableSize(integerType) * 8 - 1);
  if (value >= minNegativeValue) {
    // no overflow
    return value;
  }
  const diff = minNegativeValue - value;
  return (
    Math.pow(2, getVariableSize(integerType) * 8 - 1) -
    (diff % Math.pow(2, getVariableSize(integerType) * 8))
  );
}

/**
 * Handles signed integer constant values which are too large. This in undefined behaviour as per standard, hence this handling is specific to this compiler, meant to mimic existing compilers.
 */
function handlePositiveSignedIntegerOverflow(
  value: number,
  signedType: SignedIntegerType
) {
  const maxVal = getMaxValueOfSignedIntType(signedType);
  if (value <= maxVal) {
    // no overflow
    return value;
  }
  const diff = value - maxVal;
  return (
    getMinValueOfSignedIntType(signedType) +
    ((diff % Math.pow(2, getVariableSize(signedType) * 8)) - 1)
  );
}

/**
 * Performs capping of excessively large of negative integer values used for constants. This is needed to prevent wasm errors.
 * For unsigned types, this will be wraparound. (defined behaviour)
 * For signed types with positive value, it will also be wraparound (undefined behaviour)
 * For signed types with negative value, it excessively negative numbers will "wrap" by moving from most neagtive to most positive. E.g. for 8 bits, -129 becomes 127
 */
function capIntegerValues(constant: Constant) {
  if (constant.value > 0) {
    if (isUnsignedIntegerType(constant.variableType)) {
      constant.value =
        constant.value %
        getMaxValueOfUnsignedIntType(
          constant.variableType as UnsignedIntegerType
        );
    } else {
      constant.value = handlePositiveSignedIntegerOverflow(
        constant.value,
        constant.variableType as SignedIntegerType
      );
    }
  } else if (constant.value < 0) {
    constant.value = capNegativeValue(constant.value, constant.variableType);
  }
}

/**
 * Sets the variableType of a constant (like a literal number "123") as per 6.4.4.1 of C17 standard.
 * Caps the values of the constants if necessary.
 */
function setVariableTypeOfConstant(constant: Constant) {
  // TODO: implement floating types
  if (constant.suffix === "ul") {
    constant.variableType = "unsigned long";
  } else if (constant.suffix === "u") {
    if (constant.value <= getMaxValueOfUnsignedIntType("unsigned int")) {
      constant.variableType = "unsigned int";
    } else {
      constant.variableType = "unsigned long";
    }
  } else if (constant.suffix === "l") {
    constant.variableType = "signed long";
  } else {
    // no suffix
    if (constant.value < 0) {
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
}

export function processConstant(constant: Constant) {
  setVariableTypeOfConstant(constant);
  capIntegerValues(constant);
}

/**
 * Returns the correct varaible type for a binary expression accorsinf to rules of arithemetic conversion 6.3.1.8 in C17 standard.
 * Follows integer promition rules for integral types. Promotion follows by size of the variable (larger size = higher rank)
 */
function determineVariableTypeOfBinaryExpression(
  binaryExpression: BinaryExpression
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
  binaryExpression: BinaryExpression
) {
  binaryExpression.variableType =
    determineVariableTypeOfBinaryExpression(binaryExpression);
}

/**
 * Sets the variable type of any kind of expression that involves accessing a symbol.
 */
export function setVariableTypeOfSymbolAccessExpression(
  node: FunctionCall | VariableExpr | ArrayElementExpr,
  symbolTable: SymbolTable
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
