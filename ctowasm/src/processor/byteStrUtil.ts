/**
 * Some utility functions for converting variable intializers into byte strings.
 */

import { ProcessingError } from "~src/errors";
import { ConstantP } from "~src/processor/c-ast/expression/constants";
import { DataType } from "~src/parser/c-ast/dataTypes";
import evaluateCompileTimeExpression from "~src/processor/evaluateCompileTimeExpression";
import { getDataTypeSize } from "~src/processor/dataTypeUtil";
import { isIntegerType, primaryDataTypeSizes } from "~src/common/utils";
import {
  FloatDataType,
  IntegerDataType,
  ScalarCDataType,
} from "~src/common/types";

export function getZeroInializerByteStrForDataType(dataType: DataType) {
  let byteStr = "";
  if (
    dataType.type === "primary" ||
    dataType.type === "pointer" ||
    dataType.type === "enum"
  ) {
    const numOfBytes = getDataTypeSize(dataType);
    for (let i = 0; i < numOfBytes; ++i) {
      byteStr += "\\00";
    }
  } else if (dataType.type === "array") {
    const numElements = evaluateCompileTimeExpression(
      dataType.numElements,
    ).value;
    const elementZeroStr = getZeroInializerByteStrForDataType(
      dataType.elementDataType,
    );
    for (let i = 0; i < numElements; i++) {
      byteStr += elementZeroStr;
    }
  } else if (dataType.type === "struct") {
    dataType.fields.forEach((field) => {
      byteStr +=
        field.dataType.type === "struct self pointer"
          ? getZeroInializerByteStrForDataType({
              // just initialize the zero pointer like any other pointer
              type: "pointer",
              pointeeType: null,
            })
          : getZeroInializerByteStrForDataType(field.dataType);
    });
  } else if (dataType.type === "function") {
    throw new ProcessingError("Cannot initialize a function data type");
  }

  return byteStr;
}

/**
 * Converts a Constant into its byte string representation in little endian format.
 * Takes into account the target data type.
 */
export function convertConstantToByteStr(
  constant: ConstantP,
  targetDataType: ScalarCDataType,
) {
  // shouldnt be assigning ints to pointer. THis is a constraint violation TODO: consider an error here to user based on a flag set on compiler
  if (targetDataType === "pointer") {
    targetDataType = "unsigned int";
  }

  if (isIntegerType(targetDataType)) {
    targetDataType = targetDataType as IntegerDataType;
    if (constant.type === "FloatConstant") {
      // need to truncate the value
      return convertIntegerToByteString(
        BigInt(Math.trunc(constant.value)),
        primaryDataTypeSizes[targetDataType],
      );
    } else {
      return convertIntegerToByteString(
        constant.value,
        primaryDataTypeSizes[targetDataType],
      );
    }
  } else {
    targetDataType = targetDataType as FloatDataType;
    if (constant.type === "IntegerConstant") {
      // Number will automatically handle converting to the next representable value TODO: check if this is next highest or lowest
      return convertFloatNumberToByteString(
        Number(constant.value),
        targetDataType,
      );
    } else {
      // need to get a float byte string
      return convertFloatNumberToByteString(constant.value, targetDataType);
    }
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

  // fill up rest of the bytes with zeroes if the integer needs fewer bytes than numOfBytes to represent
  const goalSize = numOfBytes * 3;
  while (finalStr.length < goalSize) {
    finalStr += "\\00";
  }

  // truncate the integer by taking lowest numOfBytes bytes
  return finalStr.slice(0, 3 * numOfBytes);
}

function convertFloatNumberToByteString(
  floatValue: number,
  targetDataType: FloatDataType,
) {
  const buffer = new ArrayBuffer(primaryDataTypeSizes[targetDataType]);
  let integerValue;
  if (targetDataType === "float") {
    const float32Arr = new Float32Array(buffer);
    const uint32Arr = new Uint32Array(buffer);
    // if the floatValue is out of range, this will set it to infinity. Whereas if not exactly representable, it will also round up to next representable.
    float32Arr[0] = floatValue;
    integerValue = uint32Arr[0];
  } else {
    const float64Arr = new Float64Array(buffer);
    const uint64Arr = new BigUint64Array(buffer);
    float64Arr[0] = floatValue;
    integerValue = uint64Arr[0];
  }

  // convert the integer view of the float variable to a byte string
  return convertIntegerToByteString(
    BigInt(integerValue),
    primaryDataTypeSizes[targetDataType],
  );
}
