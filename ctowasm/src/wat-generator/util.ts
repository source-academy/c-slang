/**
 * Utility functions for WAT generation.
 */

import { REG_2, REG_F32, REG_F64, REG_I64 } from "~src/translator/memoryUtil";
import { WasmBranchTable } from "~src/translator/wasm-ast/control";
import { WasmExpression, WasmStatement } from "~src/translator/wasm-ast/core";
import { WasmDataType } from "~src/translator/wasm-ast/dataTypes";
import generateWatExpression from "~src/wat-generator/generateWatExpression";
import generateWatStatement from "~src/wat-generator/generateWatStatement";

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
  varType: WasmDataType,
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
  varType: WasmDataType,
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
  if (exprs.length === 0) {
    return "";
  }
  let argsStr = "";
  for (const arg of exprs) {
    argsStr += generateWatExpression(arg) + " ";
  }
  return " " + argsStr.trim();
}

/**
 * Given an array of WASM statement AST nodes, returns a list of WAT statements.
 */
export function generateStatementsList(statements: WasmStatement[]) {
  return statements.map((s) => generateWatStatement(s)).join(" ");
}

export function generateBranchTableInstruction(branchTable: WasmBranchTable) {
  let indexes = "";
  for (let i = 0; i <= branchTable.maxIndex; ++i) {
    indexes += `${i} `;
  }
  return `(br_table ${indexes}${generateWatExpression(
    branchTable.indexExpression,
  )})`;
}

/**
 * Returns the name of temp psuedo register for storing temp value of given wasm data type.
 */
export function getTempRegister(wasmDataType: WasmDataType) {
  switch (wasmDataType) {
    case "i32":
      return REG_2;
    case "i64":
      return REG_I64;
    case "f32":
      return REG_F32;
    case "f64":
      return REG_F64;
  }
}
