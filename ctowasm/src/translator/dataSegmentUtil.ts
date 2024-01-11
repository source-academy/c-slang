/**
 * Some utility functions for converting variable intializers into byte strings.
 */

import {
  Constant,
  FloatConstant,
  IntegerConstant,
} from "~src/parser/c-ast/expression/constant";
import { Initializer } from "~src/parser/c-ast/declaration";
import { isConstant, isIntegerType } from "~src/common/utils";
import { getDataTypeSize } from "~src/processor/dataTypeUtil";
import { TranslationError } from "~src/errors";

/**
 * Converts a given variable to byte string, for storage in data segment.
 */

export function convertVariableToByteStr(initializer: Initializer) {
  if (initializer.type === "InitializerSingle") {
    if (!isConstant(initializer.value)) {
      // A single initializer must already be a constant
      throw new TranslationError(
        "convertVariableToByteStr: initializer value is not a constant"
      );
    }
    const n = initializer.value as Constant;
    return convertConstantToByteStr(n);
  }

  // Initializer list
  let finalStr = "";
  initializer.values.forEach((element) => {
    if (!isConstant(element)) {
      // should already be a constant
      throw new TranslationError(
        "convertVariableToByteStr: initializer list element is not a constant"
      );
    }
    finalStr += convertConstantToByteStr(element as Constant);
  });
  return finalStr;
}
/**
 * Converts a Constant into its byte string representation in little endian format.
 */
function convertConstantToByteStr(constant: Constant) {
  if (isIntegerType(constant.dataType)) {
    return convertIntegerConstantToByteString(constant as IntegerConstant);
  } else {
    // need to get a float byte string
    return convertFloatConstantToByteString(constant as FloatConstant);
  }
}

/**
 * Converts an integer into a string of bytes with numOfBytes length.
 */
function convertIntegerToByteString(integer: bigint, numOfBytes: number) {
  if (integer < 0) {
    // convert to 2's complement equivalent in terms of positive number
    integer = 2n ** (BigInt(numOfBytes) * 8n) + integer;
  }
  const hexString = integer.toString(16);
  const strSplit = hexString.split("");
  if (hexString.length % 2 == 1) {
    strSplit.splice(0, 0, "0");
  }
  let finalStr = "";
  for (let i = strSplit.length - 1; i >= 0; i = i - 2) {
    finalStr += "\\" + strSplit[i - 1] + strSplit[i];
  }
  const goalSize = numOfBytes * 3;
  while (finalStr.length < goalSize) {
    finalStr += "\\00";
  }
  return finalStr;
}

function convertIntegerConstantToByteString(integerConstant: IntegerConstant) {
  return convertIntegerToByteString(
    integerConstant.value,
    getDataTypeSize(integerConstant.dataType)
  );
}

function convertFloatConstantToByteString(floatConstant: FloatConstant) {
  const buffer = new ArrayBuffer(getDataTypeSize(floatConstant.dataType));
  let integerValue;
  if (floatConstant.dataType.primaryDataType === "float") {
    const float32Arr = new Float32Array(buffer);
    const uint32Arr = new Uint32Array(buffer);
    float32Arr[0] = floatConstant.value;
    integerValue = uint32Arr[0];
  } else {
    // 64 bit float
    const float64Arr = new Float64Array(buffer);
    const uint64Arr = new BigUint64Array(buffer);
    float64Arr[0] = floatConstant.value;
    integerValue = uint64Arr[0];
  }

  // convert the integer view of the float variable to a byte string
  return convertIntegerToByteString(
    BigInt(integerValue),
    getDataTypeSize(floatConstant.dataType)
  );
}
