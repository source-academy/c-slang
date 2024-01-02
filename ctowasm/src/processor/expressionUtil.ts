/**
 * Definitions of various utility functions used for processing the C AST expressions.
 */

import { Constant, FloatConstant, IntegerConstant } from "~src/c-ast/constants";
import {
  BinaryOperator,
  FloatDataType,
  IntegerDataType,
  SignedIntegerType,
  UnsignedIntegerType,
  PrimaryCDataType,
  DataType,
  PrimaryDataType,
  ScalarDataType,
} from "~src/common/types";
import {
  getDataTypeSize,
  isConstant,
  isFloatType,
  isIntegerType,
  isScalarType,
  isSignedIntegerType,
  isUnsignedIntegerType,
  primaryVariableSizes,
} from "~src/common/utils";
import { ProcessingError, toJson } from "~src/errors";
import { BinaryExpression } from "~src/c-ast/binaryExpression";
import { VariableExpr } from "~src/c-ast/variable";
import { FunctionCall } from "~src/c-ast/functions";
import { SymbolTable } from "~src/processor/symbolTable";

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
 */
export function evaluateConstantBinaryExpression(
  binaryExpr: BinaryExpression | Constant
): Constant {
  if (isConstant(binaryExpr)) {
    // alerady a constant
    return binaryExpr as Constant;
  }

  if (binaryExpr.type !== "BinaryExpression") {
    throw new ProcessingError(
      `Unknown node being used as binary expression in evaluation of constant binary expressions: ${toJson(
        binaryExpr
      )}`
    );
  }

  // need to perform the appropriate truncation on the value if necessary as per C standard
  let value = performBinaryOperation(
    evaluateConstantBinaryExpression(
      binaryExpr.leftExpr as BinaryExpression | Constant
    ).value,
    binaryExpr.operator,
    evaluateConstantBinaryExpression(
      binaryExpr.rightExpr as BinaryExpression | Constant
    ).value
  );

  const dataType = determineDataTypeOfBinaryExpression(binaryExpr);

  if (isIntegerType(binaryExpr.dataType)) {
    // need to cap integer values correctly
    value = getAdjustedIntValueAccordingToDataType(value as bigint, dataType);

    return {
      type: "IntegerConstant",
      dataType: dataType as {
        type: "primary";
        primaryDataType: IntegerDataType;
      },
      value,
      position: binaryExpr.position,
    };
  } else {
    // the result of the binary expression is a floating point
    return {
      type: "FloatConstant",
      dataType: dataType as {
        type: "primary";
        primaryDataType: FloatDataType;
      },
      value: value as number,
      position: binaryExpr.position,
    };
  }
}

/**
 * Get the adjusted numeric value of a value according to its variable type, as per C standard.
 */
function getAdjustedIntValueAccordingToDataType(
  value: bigint,
  dataType: DataType
) {
  let newValue = value;
  // handle integer overflows
  if (
    isSignedIntegerType(dataType) &&
    newValue >
      getMaxValueOfSignedIntType(
        (dataType as PrimaryDataType).primaryDataType as SignedIntegerType
      )
  ) {
    newValue =
      newValue %
      getMaxValueOfSignedIntType(
        (dataType as PrimaryDataType).primaryDataType as SignedIntegerType
      );
  } else if (
    isUnsignedIntegerType(dataType) &&
    newValue >
      getMaxValueOfUnsignedIntType(
        (dataType as PrimaryDataType).primaryDataType as UnsignedIntegerType
      )
  ) {
    newValue =
      newValue %
      getMaxValueOfUnsignedIntType(
        (dataType as PrimaryDataType).primaryDataType as UnsignedIntegerType
      );
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
function capIntegerValue(constant: IntegerConstant) {
  if (constant.value > 0) {
    if (isUnsignedIntegerType(constant.dataType)) {
      constant.value =
        constant.value %
        getMaxValueOfUnsignedIntType(
          constant.dataType.primaryDataType as UnsignedIntegerType
        );
    } else {
      constant.value = handlePositiveSignedIntegerOverflow(
        constant.value,
        constant.dataType.primaryDataType as SignedIntegerType
      );
    }
  } else if (constant.value < 0) {
    constant.value = capNegativeValue(
      constant.value,
      constant.dataType.primaryDataType
    );
  }
}

/**
 * If the constant overflows float (double corresponds to js number type, so that is already handled), need to cap it to ensure there is no wasm error. This is undefined behaviour, but meant to mimic existing compilers.
 */
function capFloatValue(constant: FloatConstant) {
  if (constant.dataType.primaryDataType === "float") {
    constant.value = Math.fround(constant.value);
  }
}

/**
 * Cap the values of constants that have overflowing values to avoid wasm runtime errors.
 */
function capConstantValues(constant: Constant) {
  if (constant.type === "IntegerConstant") {
    capIntegerValue(constant);
  } else {
    // floating point constant
    capFloatValue(constant);
  }
}

/**
 * Sets the dataType of a constant (like a literal number "123") as per 6.4.4.1 of C17 standard.
 * Caps the values of the constants if necessary.
 */
function setDataTypeOfConstant(constant: Constant) {
  function createPrimaryDataType<T extends PrimaryCDataType>(
    varType: T
  ): { type: "primary"; primaryDataType: typeof varType } {
    return {
      type: "primary",
      primaryDataType: varType,
    };
  }

  if (constant.type === "IntegerConstant") {
    if (constant.suffix === "ul") {
      constant.dataType = createPrimaryDataType("unsigned long");
    } else if (constant.suffix === "u") {
      if (constant.value <= getMaxValueOfUnsignedIntType("unsigned int")) {
        constant.dataType = createPrimaryDataType("unsigned int");
      } else {
        constant.dataType = createPrimaryDataType("unsigned long");
      }
    } else if (constant.suffix === "l") {
      constant.dataType = createPrimaryDataType("signed long");
    } else {
      // no suffix
      if (constant.value < 0) {
        if (constant.value >= getMinValueOfSignedIntType("signed int")) {
          constant.dataType = createPrimaryDataType("signed int");
        } else if (
          constant.value >= getMinValueOfSignedIntType("signed long")
        ) {
          constant.dataType = createPrimaryDataType("signed long");
        } else {
          // integer is too negative
          // TODO: possibly inform user with warning here
          constant.dataType = createPrimaryDataType("signed long");
        }
      } else {
        if (constant.value <= getMaxValueOfSignedIntType("signed int")) {
          constant.dataType = createPrimaryDataType("signed int");
        } else if (
          constant.value <= getMaxValueOfSignedIntType("signed long")
        ) {
          constant.dataType = createPrimaryDataType("signed long");
        } else {
          // integer is too large
          // TODO: possibly inform user with warning here
          constant.dataType = createPrimaryDataType("signed long");
        }
      }
    }
  } else {
    // handle float constant
    if (constant.suffix === "f") {
      constant.dataType = createPrimaryDataType("float");
    } else {
      // by default all float constants are doubles if "f"/"F" suffix is not specified
      constant.dataType = createPrimaryDataType("double");
    }
  }
}

export function processConstant(constant: Constant) {
  setDataTypeOfConstant(constant);
  capConstantValues(constant);
}

/**
 * Returns the correct varaible type for a binary expression accorsinf to rules of arithemetic conversion 6.3.1.8 in C17 standard.
 * Follows integer promition rules for integral types. Promotion follows by size of the variable (larger size = higher rank)
 */
function determineDataTypeOfBinaryExpression(
  binaryExpression: BinaryExpression
): ScalarDataType {
  if (
    !isScalarType(binaryExpression.leftExpr.dataType) ||
    !isScalarType(binaryExpression.rightExpr.dataType)
  ) {
    throw new ProcessingError(
      `Non-Scalar type used as operand in "${binaryExpression.operator}" binary expression`
    );
  }
  const leftExprDataType = binaryExpression.leftExpr.dataType as ScalarDataType;
  const rightExprDataType = binaryExpression.rightExpr
    .dataType as ScalarDataType;

  if (
    isFloatType(binaryExpression.leftExpr.dataType) &&
    isFloatType(binaryExpression.rightExpr.dataType)
  ) {
    // take more higher ranking float type
    if (
      getDataTypeSize(binaryExpression.rightExpr.dataType) >
      getDataTypeSize(binaryExpression.leftExpr.dataType)
    ) {
      return leftExprDataType;
    } else {
      return rightExprDataType;
    }
  } else if (isFloatType(binaryExpression.leftExpr.dataType)) {
    // float types have greater precedence than any integer types
    return leftExprDataType;
  } else if (isFloatType(binaryExpression.rightExpr.dataType)) {
    return rightExprDataType;
  } else {
    // both types are integers
    // special handling for bitwise shift, which does not follow usual arithmetic implicit conversion rules
    if (
      binaryExpression.operator === "<<" ||
      binaryExpression.operator === ">>"
    ) {
      return leftExprDataType;
    }

    if (
      getDataTypeSize(binaryExpression.rightExpr.dataType) >
      getDataTypeSize(binaryExpression.leftExpr.dataType)
    ) {
      return rightExprDataType;
    } else {
      return rightExprDataType;
    }
  }
}

/**

 * TODO: add unsigned behaviour later.
 * TODO: add float handling later
 */
export function setDataTypeOfBinaryExpression(
  binaryExpression: BinaryExpression
) {
  binaryExpression.dataType =
    determineDataTypeOfBinaryExpression(binaryExpression);
}

/**
 * Sets the variable type of any kind of expression that involves accessing a symbol.
 */
export function setDataTypeOfSymbolAccessExpression(
  node: FunctionCall | VariableExpr,
  symbolTable: SymbolTable
) {
  const symbolEntry = symbolTable.getSymbolEntry(node.name);
  if (symbolEntry.type === "function") {
    node.dataType = symbolEntry.returnType;
  } else {
    node.dataType = symbolEntry.dataType;
  }
}
