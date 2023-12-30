/**
 * Utility functions for WAT generation.
 */

import { FloatDataType, PrimaryCDataType } from "~src/common/types";
import { getVariableSize } from "~src/common/utils";
import { WasmConst } from "~src/wasm-ast/consts";
import { WasmExpression, WasmStatement } from "~src/wasm-ast/core";
import {
  MemoryVariableByteSize,
  WasmDataSegmentArray,
  WasmDataSegmentVariable,
} from "~src/wasm-ast/memory";
import { WasmType } from "~src/wasm-ast/types";
import generateFunctionBodyWat from "~src/wat-generator/generateFunctionBodyWat";

/**
 * Function that returns a line in wat file with given level of identation & ending with newline.
 */
export function generateLine(line: string, indentation: number) {
  return "\t".repeat(indentation) + line + "\n";
}

/**
 * Function that takes a block of strings (newline separated lines) and indents them with given indentation.
 */
export function generateBlock(block: string, indentation: number) {
  let watStr = "";
  for (const line of block.split("\n")) {
    watStr += generateLine(line, indentation);
  }
  return watStr;
}

/**
 * Returns the appropriate memory instruction for a memory load.
 * TODO: support unsigned types in future.
 */
export function getWasmMemoryLoadInstruction(
  varType: WasmType,
  numOfBytes: number
) {
  if (
    ((varType === "i32" || varType === "f32") && numOfBytes === 4) ||
    ((varType === "i64" || varType === "f64") && numOfBytes === 8)
  ) {
    return `${varType}.load`;
  }
  return `${varType}.load${(numOfBytes * 8).toString()}_s`;
}

export function getWasmMemoryStoreInstruction(
  varType: WasmType,
  numOfBytes: number
) {
  if (
    ((varType === "i32" || varType === "f32") && numOfBytes === 4) ||
    ((varType === "i64" || varType === "f64") && numOfBytes === 8)
  ) {
    return `${varType}.store`;
  }
  return `${varType}.store${(numOfBytes * 8).toString()}`;
}

/**
 * Returns string of argument expressions that are provided to function calls, or certain instructions like add.
 * Basically any instruction that needs to read multiple variables from the stack can use this function to conveniently attach all
 * the subexpressions that form the stack values.
 */
export function generateArgString(exprs: WasmExpression[]) {
  let argsStr = "";
  for (const arg of exprs) {
    argsStr += generateFunctionBodyWat(arg) + " ";
  }
  return argsStr.trim();
}

/**
 * Given an array of WASM statement AST nodes, returns a list of WAT statements.
 */
export function generateStatementsList(
  statements: (WasmStatement | WasmExpression)[]
) {
  return statements.map((s) => generateFunctionBodyWat(s)).join(" ");
}

export function getPreStatementsStr(
  preStatements?: (WasmStatement | WasmExpression)[]
) {
  const s = preStatements
    ? preStatements.map((s) => generateFunctionBodyWat(s))
    : [];
  return s.length > 0 ? " " + s.join(" ") : "";
}

/**
 * Converts a given variable to byte string, for storage in data segment.
 */
export function convertVariableToByteStr(
  variable: WasmDataSegmentArray | WasmDataSegmentVariable
) {
  if (variable.type === "DataSegmentVariable") {
    return convertWasmNumberToByteStr(
      variable.initializerValue,
      variable.cVarType
    );
  }
  // DataSegmentArray
  let finalStr = "";
  variable.initializerList.forEach((element) => {
    finalStr += convertWasmNumberToByteStr(element, variable.cVarType);
  });
  return finalStr;
}

/**
 * Converts a wasm number to a bytes str with @size bytes
 */
function convertWasmNumberToByteStr(
  num: WasmConst,
  variableType: PrimaryCDataType
) {
  if (num.type === "IntegerConst") {
    return convertIntegerToByteString(num.value, getVariableSize(variableType));
  } else {
    // need to get a float byte string
    return convertFloatToByteString(num.value, variableType as FloatDataType);
  }
}

function convertIntegerToByteString(
  val: bigint,
  numOfBytes: MemoryVariableByteSize
) {
  if (val < 0) {
    // convert to 2's complement equivalent in terms of positive number
    val = 2n ** (BigInt(numOfBytes) * 8n) + val;
  }
  const hexString = val.toString(16);
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

function convertFloatToByteString(val: number, floatType: FloatDataType) {
  const buffer = new ArrayBuffer(getVariableSize(floatType));
  let integerValue;
  if (floatType === "float") {
    const float32Arr = new Float32Array(buffer);
    const uint32Arr = new Uint32Array(buffer);
    float32Arr[0] = val;
    integerValue = uint32Arr[0];
  } else {
    // 64 bit float
    const float64Arr = new Float64Array(buffer);
    const uint64Arr = new BigUint64Array(buffer);
    float64Arr[0] = val;
    integerValue = uint64Arr[0];
  }

  // convert the integer view of the float variable to a byte string
  return convertIntegerToByteString(
    BigInt(integerValue),
    getVariableSize(floatType)
  );
}
