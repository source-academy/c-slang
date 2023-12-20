/**
 * Utility functions for WAT generation.
 */

import { WasmConst, WasmExpression, WasmStatement } from "~src/wasm-ast/core";
import { WasmDataSegmentArray, WasmDataSegmentVariable } from "~src/wasm-ast/memory";
import { WasmType } from "~src/wasm-ast/types";
import { generateExprStr } from "~src/wat-generator/expression";
import { generateStatementStr } from "~src/wat-generator/statement";

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
  numOfBytes: number,
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
  numOfBytes: number,
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
    argsStr += generateExprStr(arg) + " ";
  }
  return argsStr.trim();
}

/**
 * Given an array of WASM statement AST nodes, returns a list of WAT statements.
 */
export function generateStatementsList(
  statements: (WasmStatement | WasmExpression)[],
) {
  return statements
    .map((s) => generateStatementStr(s) ?? generateExprStr(s as WasmExpression))
    .join(" ");
}

export function getPreStatementsStr(
  preStatements?: (WasmStatement | WasmExpression)[],
) {
  const s = preStatements
    ? preStatements.map(
        (s) => generateStatementStr(s) ?? generateExprStr(s as WasmExpression),
      )
    : [];
  return s.length > 0 ? " " + s.join(" ") : "";
}

/**
 * Converts a given variable to byte string, for storage in data segment.
 */
export function convertVariableToByteStr(
  variable: WasmDataSegmentArray | WasmDataSegmentVariable,
) {
  if (variable.type === "DataSegmentVariable") {
    return convertWasmNumberToByteStr(variable.initializerValue, variable.size);
  }
  // DataSegmentArray
  let finalStr = "";
  variable.initializerList.forEach((element) => {
    finalStr += convertWasmNumberToByteStr(element, variable.elementSize);
  });
  return finalStr;
}

/**
 * Converts a wasm number to a bytes str with @size bytes
 */
export function convertWasmNumberToByteStr(num: WasmConst, size: number) {
  let val = num.value;
  console.log(val)
  if (val < 0) {
    // convert to 2's complement equivalent in terms of positive number
    val = Math.pow(2, size * 8) + val;
  }
  console.log(val)
  const hexString = val.toString(16);
  const strSplit = hexString.split("");
  if (hexString.length % 2 == 1) {
    const lastDigit = strSplit[strSplit.length - 1];
    strSplit[strSplit.length - 1] = "0";
    strSplit.push(lastDigit);
  }
  let finalStr = "";
  for (let i = strSplit.length - 1; i >= 0; i = i - 2) {
    finalStr += "\\" + strSplit[i - 1] + strSplit[i];
  }
  const goalSize = size * 3;
  while (finalStr.length < goalSize) {
    finalStr += "\\00";
  }
  return finalStr;
}
