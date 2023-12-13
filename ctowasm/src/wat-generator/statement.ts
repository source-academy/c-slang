import {
  WasmSelectStatement,
  WasmLoop,
  WasmBlock,
  WasmBranch,
  WasmBranchIf,
} from "~src/wasm-ast/control";
import {
  WasmFunctionBodyLine,
  WasmFunctionCallStatement,
  WasmRegularFunctionCall,
} from "~src/wasm-ast/functions";
import { WasmMemoryGrow, WasmMemoryStore } from "~src/wasm-ast/memory";
import { WasmGlobalSet, WasmLocalSet } from "~src/wasm-ast/variables";
import { generateExprStr } from "~src/wat-generator/expression";
import {
  getPreStatementsStr,
  generateStatementsList,
  getWasmMemoryStoreInstruction,
} from "~src/wat-generator/util";

/**
 * Generates the WAT line for a given statement present in a function.
 */
export function generateStatementStr(statement: WasmFunctionBodyLine): string {
  if (statement.type === "GlobalSet") {
    const n = statement as WasmGlobalSet;
    return `(global.set $${n.name}${getPreStatementsStr(
      n.preStatements,
    )} ${generateExprStr(n.value)})`;
  } else if (statement.type === "LocalSet") {
    const n = statement as WasmLocalSet;
    return `(local.set $${n.name}${getPreStatementsStr(
      n.preStatements,
    )} ${generateExprStr(n.value)})`;
  } else if (statement.type === "FunctionCallStatement") {
    const n = statement as WasmFunctionCallStatement;
    return `(call $${n.name} ${generateStatementsList(
      n.stackFrameSetup,
    )}) ${generateStatementsList(n.stackFrameTearDown)}`;
  } else if (
    statement.type === "GlobalGet" ||
    statement.type === "Const" ||
    statement.type === "LocalGet"
  ) {
    return generateExprStr(statement);
  } else if (statement.type === "SelectStatement") {
    const n = statement as WasmSelectStatement;
    return `(if ${generateExprStr(statement.condition)} (then ${n.actions
      .map((action) => generateStatementStr(action))
      .join(" ")})${
      n.elseStatements.length > 0
        ? " (else" +
          n.elseStatements
            .map((statement) => generateStatementStr(statement))
            .join(" ") +
          ")"
        : ""
    })`;
  } else if (statement.type === "ReturnStatement") {
    return `(return)`;
  } else if (statement.type === "Loop") {
    const n = statement as WasmLoop;
    return `(loop $${n.label}${
      n.body.length > 0
        ? " " + n.body.map((line) => generateStatementStr(line)).join(" ")
        : ""
    })`;
  } else if (statement.type === "Block") {
    const n = statement as WasmBlock;
    return `(block $${n.label}${
      n.body.length > 0
        ? " " + n.body.map((line) => generateStatementStr(line)).join(" ")
        : ""
    })`;
  } else if (statement.type === "Branch") {
    const n = statement as WasmBranch;
    return `(br $${n.label})`;
  } else if (statement.type === "BranchIf") {
    const n = statement as WasmBranchIf;
    return `(br_if $${n.label} ${generateExprStr(n.condition)})`;
  } else if (statement.type === "MemoryGrow") {
    const n = statement as WasmMemoryGrow;
    return `(drop (memory.grow ${generateExprStr(n.pagesToGrowBy)}))`;
  } else if (statement.type === "MemoryStore") {
    const n = statement as WasmMemoryStore;
    return `(${getWasmMemoryStoreInstruction(
      n.varType,
      n.numOfBytes,
    )}${getPreStatementsStr(n.preStatements)} ${generateExprStr(
      n.addr,
    )} ${generateExprStr(n.value)})`;
  } else if (statement.type === "RegularFunctionCall") {
    const n = statement as WasmRegularFunctionCall;
    return `(call $${n.name}${
      n.args.length > 0
        ? " " + n.args.map((arg) => generateExprStr(arg)).join(" ")
        : ""
    })`;
  }
  return null;
}
