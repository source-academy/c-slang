/**
 * Utility functions for WAT generation.
 */

import { WasmExpression, WasmStatement } from "~src/wasm-ast/core";
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
