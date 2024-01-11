/**
 * Some helper functions regarding the processing of constants.
 */
import { POINTER_SIZE } from "~src/common/constants";
import {
  ScalarCDataType,
  SignedIntegerType,
  UnsignedIntegerType,
  IntegerDataType,
  FloatDataType,
  PrimaryCDataType,
} from "~src/common/types";
import {
  isSignedIntegerType,
  isUnsignedIntegerType,
  primaryVariableSizes,
} from "~src/common/utils";
import Constant from "~src/parser/c-ast/expression/constant";
import { ConstantP } from "~src/processor/c-ast/expression/constants";

/**
 * Get the adjusted numeric value of a value according to its variable type, as per C standard.
 */

export function getAdjustedIntValueAccordingToDataType(
  value: bigint,
  dataType: ScalarCDataType
) {
  let newValue = value;
  // handle integer overflows
  if (
    isSignedIntegerType(dataType) &&
    newValue > getMaxValueOfSignedIntType(dataType as SignedIntegerType)
  ) {
    newValue =
      newValue %
      (getMaxValueOfSignedIntType(dataType as SignedIntegerType) + 1n);
  } else if (
    isUnsignedIntegerType(dataType) &&
    newValue > getMaxValueOfUnsignedIntType(dataType as UnsignedIntegerType)
  ) {
    newValue =
      newValue %
      (getMaxValueOfUnsignedIntType(dataType as UnsignedIntegerType) + 1n);
  } else if (dataType === "pointer" && newValue > 2 ** (POINTER_SIZE * 8) - 1) {
    // just some implementation defined behaviour
    // although assigning int values to pointer types directly is undefined behaviour and should not be done.
    // TODO: check this
    newValue = newValue % 2n ** (BigInt(POINTER_SIZE) * 8n);
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

export default function processConstant(constant: Constant): ConstantP {
  const dataType = getDataTypeOfConstant(constant);
  const cappedValue = getCappedConstantValue(constant, dataType);
  return {
    type: constant.type,
    value: cappedValue,
    dataType: dataType,
  } as ConstantP;
}
