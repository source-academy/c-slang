/**
 * Some utility functions for converting variable intializers into byte strings.
 */

import { ProcessingError, UnsupportedFeatureError } from "~src/errors";
import {
  ConstantP,
  FloatConstantP,
  IntegerConstantP,
} from "~src/processor/c-ast/expression/constants";
import { DataType } from "~src/parser/c-ast/dataTypes";
import evaluateCompileTimeExpression from "~src/processor/evaluateCompileTimeExpression";
import { getDataTypeSize } from "~src/processor/dataTypeUtil";
import { isIntegerType, primaryDataTypeSizes } from "~src/common/utils";

export function getZeroInializerByteStrForDataType(dataType: DataType) {
  let byteStr = "";
  if (dataType.type === "primary" || dataType.type === "pointer") {
    const numOfBytes = getDataTypeSize(dataType);
    for (let i = 0; i < numOfBytes; ++i) {
      byteStr += "\\00";
    }
  } else if (dataType.type === "array") {
    const numElements = evaluateCompileTimeExpression(
      dataType.numElements
    ).value;
    const elementZeroStr = getZeroInializerByteStrForDataType(
      dataType.elementDataType
    );
    for (let i = 0; i < numElements; i++) {
      byteStr += elementZeroStr;
    }
  } else if (dataType.type === "struct") {
    // TODO: struct
    throw new UnsupportedFeatureError("structs not yet supported");
  } else if (dataType.type === "function") {
    throw new ProcessingError("Cannot initialize a function data type");
  }

  return byteStr;
}

/**
 * Converts a Constant into its byte string representation in little endian format.
 */
export function convertConstantToByteStr(constant: ConstantP) {
  if (isIntegerType(constant.dataType)) {
    return convertIntegerConstantToByteString(constant as IntegerConstantP);
  } else {
    // need to get a float byte string
    return convertFloatConstantToByteString(constant as FloatConstantP);
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

function convertIntegerConstantToByteString(integerConstant: IntegerConstantP) {
  return convertIntegerToByteString(
    integerConstant.value,
    primaryDataTypeSizes[integerConstant.dataType]
  );
}

function convertFloatConstantToByteString(floatConstant: FloatConstantP) {
  const buffer = new ArrayBuffer(primaryDataTypeSizes[floatConstant.dataType]);
  let integerValue;
  if (floatConstant.dataType === "float") {
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
    primaryDataTypeSizes[floatConstant.dataType]
  );
}
