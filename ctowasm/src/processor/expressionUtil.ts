/**
 * Definitions of various utility functions used for processing the C AST expressions.
 */

import { Constant } from "~src/parser/c-ast/constants";
import {
  BinaryOperator,
  FloatDataType,
  IntegerDataType,
  SignedIntegerType,
  UnsignedIntegerType,
  PrimaryCDataType,
} from "~src/common/types";
import {
  isFloatType,
  isIntegerType,
  isSignedIntegerType,
  isUnsignedIntegerType,
  primaryVariableSizes,
} from "~src/common/utils";
import { ProcessingError, toJson } from "~src/errors";
import { BinaryExpression } from "~src/parser/c-ast/binaryExpression";
import { ExpressionP } from "~src/processor/c-ast/core";
import { ConstantP } from "~src/processor/c-ast/constants";

/**
 * Evaluates the result of the binary expression a <operator> b.
 */
export function performBinaryOperation<T extends number | bigint>(
  a: T,
  operator: BinaryOperator,
  b: T
): T;
export function performBinaryOperation(
  a: any,
  operator: BinaryOperator,
  b: any
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
 * TODO: another check in future on correctness
 */
export function evaluateConstantBinaryExpression(
  expr: BinaryExpression | Constant
): ConstantP {
  if (expr.type === "FloatConstant" || expr.type === "IntegerConstant") {
    // alerady a constant
    return processConstant(expr);
  }

  if (expr.type !== "BinaryExpression") {
    throw new ProcessingError(
      `Unknown node being used as binary expression in evaluation of constant binary expressions: ${toJson(
        expr
      )}`
    );
  }

  // need to perform the appropriate truncation on the value if necessary as per C standard
  const evaluatedLeftExpr = evaluateConstantBinaryExpression(
    expr.leftExpr as BinaryExpression | Constant
  );
  const evaluatedRightExpr = evaluateConstantBinaryExpression(
    expr.rightExpr as BinaryExpression | Constant
  );

  let value = performBinaryOperation(
    evaluatedLeftExpr.value,
    expr.operator,
    evaluatedRightExpr.value
  );

  const dataType = determineDataTypeOfBinaryExpression(
    evaluatedLeftExpr,
    evaluatedRightExpr,
    expr.operator
  );

  if (isIntegerType(dataType)) {
    // need to cap integer values correctly
    value = getAdjustedIntValueAccordingToDataType(value as bigint, dataType);

    return {
      type: "IntegerConstant",
      dataType: dataType as IntegerDataType,
      value,
    };
  } else {
    // the result of the binary expression is a floating point
    return {
      type: "FloatConstant",
      dataType: dataType as FloatDataType,
      value: value as number,
    };
  }
}

/**
 * Get the adjusted numeric value of a value according to its variable type, as per C standard.
 */
function getAdjustedIntValueAccordingToDataType(
  value: bigint,
  dataType: PrimaryCDataType
) {
  let newValue = value;
  // handle integer overflows
  if (
    isSignedIntegerType(dataType) &&
    newValue > getMaxValueOfSignedIntType(dataType as SignedIntegerType)
  ) {
    newValue =
      newValue % getMaxValueOfSignedIntType(dataType as SignedIntegerType);
  } else if (
    isUnsignedIntegerType(dataType) &&
    newValue > getMaxValueOfUnsignedIntType(dataType as UnsignedIntegerType)
  ) {
    newValue =
      newValue % getMaxValueOfUnsignedIntType(dataType as UnsignedIntegerType);
  }

  return newValue;
}

/**
 * Returns the maximum value of a signed int type.
 */
function getMaxValueOfSignedIntType(val: SignedIntegerType): bigint {
  return 2n ** (BigInt(primaryVariableSizes[val]) * 8n - 1n) - 1n;
}

function getMinValueOfSignedIntType(val: SignedIntegerType): bigint {
  return -(2n ** (BigInt(primaryVariableSizes[val]) * 8n - 1n));
}

function getMaxValueOfUnsignedIntType(val: UnsignedIntegerType): bigint {
  return 2n ** (BigInt(primaryVariableSizes[val]) * 8n) - 1n;
}

/**
 * Logic for handling when the value of a constant is a very negative number that lies out of a range of a maxNegativeValue.
 * This, according to the standard, is signed integer overflow which is undefined. Thus the logic here is specific to this compiler
 * implementation, and is made to function similarly to other compilers.
 */
function capNegativeValue(value: bigint, integerType: IntegerDataType): bigint {
  const minNegativeValue =
    -(2n ** (BigInt(primaryVariableSizes[integerType]) * 8n)) - 1n;
  if (value >= minNegativeValue) {
    // no overflow
    return value;
  }
  const diff = minNegativeValue - value;
  return (
    2n ** (BigInt(primaryVariableSizes[integerType]) * 8n - 1n) -
    (diff % (2n ** BigInt(primaryVariableSizes[integerType]) * 8n))
  );
}

/**
 * Handles signed integer constant values which are too large. This in undefined behaviour as per standard, hence this handling is specific to this compiler, meant to mimic existing compilers.
 */
function handlePositiveSignedIntegerOverflow(
  value: bigint,
  signedType: SignedIntegerType
): bigint {
  const maxVal = getMaxValueOfSignedIntType(signedType);
  if (value <= maxVal) {
    // no overflow
    return value;
  }
  const diff = value - maxVal;
  return (
    getMinValueOfSignedIntType(signedType) +
    ((diff % 2n ** (BigInt(primaryVariableSizes[signedType]) * 8n)) - 1n)
  );
}

/**
 * Performs capping of excessively large or negative integer values used for constants. This is needed to prevent wasm errors.
 * For unsigned types, this will be wraparound. (defined behaviour)
 * For signed types with positive value, it will also be wraparound (undefined behaviour)
 * For signed types with negative value, it excessively negative numbers will "wrap" by moving from most neagtive to most positive. E.g. for 8 bits, -129 becomes 127
 */
function getCappedIntegerValue(value: bigint, dataType: IntegerDataType) {
  if (value > 0) {
    if (isUnsignedIntegerType(dataType)) {
      return (
        value % getMaxValueOfUnsignedIntType(dataType as UnsignedIntegerType)
      );
    } else {
      return handlePositiveSignedIntegerOverflow(
        value,
        dataType as SignedIntegerType
      );
    }
  } else if (value < 0) {
    return capNegativeValue(value, dataType);
  } else {
    return value;
  }
}

/**
 * If the constant overflows float (double corresponds to js number type, so that is already handled), need to cap it to ensure there is no wasm error. This is undefined behaviour, but meant to mimic existing compilers.
 */
function getCappedFloatValue(value: number, dataType: FloatDataType) {
  if (dataType === "float") {
    return Math.fround(value);
  }
  return value;
}

/**
 * Cap the values of constants that have overflowing values to avoid wasm runtime errors.
 */
function getCappedConstantValue(
  constant: Constant,
  dataType: PrimaryCDataType
): bigint | number {
  if (constant.type === "IntegerConstant") {
    return getCappedIntegerValue(constant.value, dataType as IntegerDataType);
  } else {
    // floating point constant
    return getCappedFloatValue(constant.value, dataType as FloatDataType);
  }
}

/**
 * Sets the dataType of a constant (like a literal number "123") as per 6.4.4.1 of C17 standard.
 * Caps the values of the constants if necessary.
 */
function getDataTypeOfConstant(constant: Constant) {
  if (constant.type === "IntegerConstant") {
    if (constant.suffix === "ul") {
      return "unsigned long";
    } else if (constant.suffix === "u") {
      if (constant.value <= getMaxValueOfUnsignedIntType("unsigned int")) {
        return "unsigned int";
      } else {
        return "unsigned long";
      }
    } else if (constant.suffix === "l") {
      return "signed long";
    } else {
      // no suffix
      if (constant.value < 0) {
        if (constant.value >= getMinValueOfSignedIntType("signed int")) {
          return "signed int";
        } else if (
          constant.value >= getMinValueOfSignedIntType("signed long")
        ) {
          return "signed long";
        } else {
          // integer is too negative
          // TODO: possibly inform user with warning here
          return "signed long";
        }
      } else {
        if (constant.value <= getMaxValueOfSignedIntType("signed int")) {
          return "signed int";
        } else if (
          constant.value <= getMaxValueOfSignedIntType("signed long")
        ) {
          return "signed long";
        } else {
          // integer is too large
          // TODO: possibly inform user with warning here
          return "signed long";
        }
      }
    }
  } else {
    // handle float constant
    if (constant.suffix === "f") {
      return "float";
    } else {
      // by default all float constants are doubles if "f"/"F" suffix is not specified
      return "double";
    }
  }
}

export function processConstant(constant: Constant): ConstantP {
  const dataType = getDataTypeOfConstant(constant);
  const cappedValue = getCappedConstantValue(constant, dataType);
  return {
    type: constant.type,
    value: cappedValue,
    dataType: dataType,
  } as ConstantP;
}

/**
 * Returns the correct varaible type for a binary expression accorsinf to rules of arithemetic conversion 6.3.1.8 in C17 standard.
 * Follows integer promition rules for integral types. Promotion follows by size of the variable (larger size = higher rank)
 */
export function determineDataTypeOfBinaryExpression(
  leftExpr: ExpressionP,
  rightExpr: ExpressionP,
  operator: BinaryOperator
): PrimaryCDataType {
  const leftExprDataType = leftExpr.dataType;
  const rightExprDataType = rightExpr.dataType;

  if (isFloatType(leftExpr.dataType) && isFloatType(rightExpr.dataType)) {
    // take more higher ranking float type
    if (
      primaryVariableSizes[rightExpr.dataType] >
      primaryVariableSizes[leftExpr.dataType]
    ) {
      return leftExprDataType;
    } else {
      return rightExprDataType;
    }
  } else if (isFloatType(leftExpr.dataType)) {
    // float types have greater precedence than any integer types
    return leftExprDataType;
  } else if (isFloatType(rightExpr.dataType)) {
    return rightExprDataType;
  } else {
    // both types are integers
    // special handling for bitwise shift, which does not follow usual arithmetic implicit conversion rules
    if (operator === "<<" || operator === ">>") {
      return leftExprDataType;
    }

    if (
      primaryVariableSizes[rightExpr.dataType] >
      primaryVariableSizes[leftExpr.dataType]
    ) {
      return rightExprDataType;
    } else {
      return rightExprDataType;
    }
  }
}

