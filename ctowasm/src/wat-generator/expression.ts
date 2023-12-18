import { WasmBinaryExpression } from "~src/wasm-ast/binaryExpression";
import { WasmExpression, WasmConst } from "~src/wasm-ast/core";
import { WasmFunctionCall, WasmRegularFunctionCall } from "~src/wasm-ast/functions";
import { WasmMemoryLoad } from "~src/wasm-ast/memory";
import { WasmBooleanExpression } from "~src/wasm-ast/misc";
import { WasmLocalGet, WasmGlobalGet } from "~src/wasm-ast/variables";
import { generateStatementStr } from "~src/wat-generator/statement";
import {
  generateArgString,
  generateStatementsList,
  getPreStatementsStr,
  getWasmMemoryLoadInstruction,
} from "~src/wat-generator/util";

/**
 * Given a wat Expression node, generates the string version of that expression, with brackets.
 */
export function generateExprStr(expr: WasmExpression): string {
  if (expr.type === "FunctionCall") {
    const e = expr as WasmFunctionCall;
    return `(call $${e.name} ${generateStatementsList(
      e.stackFrameSetup
    )}) ${generateStatementsList(e.stackFrameTearDown)}`;
  } else if (expr.type === "RegularFunctionCall") {
    const e = expr as WasmRegularFunctionCall;
    return `(call $${e.name} ${generateArgString(e.args)})`
  } else if (expr.type === "Const") {
    const e = expr as WasmConst;
    return `(${e.wasmVariableType}.const ${e.value.toString()})`;
  } else if (expr.type === "LocalGet") {
    const e = expr as WasmLocalGet;
    return `(local.get $${e.name}${getPreStatementsStr(e.preStatements)})`;
  } else if (expr.type === "GlobalGet") {
    const e = expr as WasmGlobalGet;
    return `(global.get $${e.name}${getPreStatementsStr(e.preStatements)})`;
  } else if (
    expr.type === "BinaryExpression" 
  ) {
    const e = expr as WasmBinaryExpression
    //TODO: support different op types other than i32
    return `(${e.instruction} ${generateExprStr(
      e.leftExpr
    )} ${generateExprStr(e.rightExpr)})`;
  } else if (expr.type === "LocalSet" || expr.type === "GlobalSet") {
    return generateStatementStr(expr);
  } else if (expr.type === "BooleanExpression") {
    const e = expr as WasmBooleanExpression;
    // TODO: need to know type of the variable to set the correct instruction
    if (e.isNegated) {
      return `(i32.eqz ${generateExprStr(e.expr)})`;
    } else {
      return `(i32.ne (i32.const 0) ${generateExprStr(e.expr)})`;
    }
  }else if (expr.type === "MemorySize") {
    return "(memory.size)";
  } else if (expr.type === "MemoryLoad") {
    const n = expr as WasmMemoryLoad;
    return `(${getWasmMemoryLoadInstruction(
      n.wasmVariableType,
      n.numOfBytes,
    )}${getPreStatementsStr(n.preStatements)} ${generateExprStr(n.addr)})`;
  } else if (expr.type === "MemoryStore") {
    return generateStatementStr(expr);
  } else {
    console.assert(
      false,
      `WAT GENERATOR ERROR: Unhandled case during WAT node to string conversion\n${JSON.stringify(
        expr
      )}`
    );
  }
}
