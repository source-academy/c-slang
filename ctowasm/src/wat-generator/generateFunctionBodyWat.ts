import { WatGeneratorError, toJson } from "~src/errors";
import { WasmBinaryExpression, WasmNegateFloatExpression } from "~src/wasm-ast/expressions";
import { WasmFloatConst, WasmIntegerConst } from "~src/wasm-ast/consts";
import {
  WasmSelectStatement,
  WasmLoop,
  WasmBlock,
  WasmBranch,
  WasmBranchIf,
} from "~src/wasm-ast/control";
import {
  WasmFunctionBodyLine,
  WasmFunctionCall,
  WasmFunctionCallStatement,
  WasmRegularFunctionCall,
  WasmRegularFunctionCallStatement,
} from "~src/wasm-ast/functions";
import {
  WasmMemoryGrow,
  WasmMemoryLoad,
  WasmMemoryStore,
} from "~src/wasm-ast/memory";
import {
  WasmBooleanExpression,
  WasmNumericConversionWrapper,
} from "~src/wasm-ast/misc";
import {
  WasmGlobalGet,
  WasmGlobalSet,
  WasmLocalGet,
  WasmLocalSet,
} from "~src/wasm-ast/variables";
import {
  getPreStatementsStr,
  generateStatementsList,
  getWasmMemoryStoreInstruction,
  generateArgString,
  getWasmMemoryLoadInstruction,
} from "~src/wat-generator/util";

/**
 * Generates the WAT from given AST node. Only to be used for nodes within a function body.
 */
export default function generateWat(node: WasmFunctionBodyLine): string {
  if (node.type === "GlobalSet") {
    const n = node as WasmGlobalSet;
    return `(global.set $${n.name}${getPreStatementsStr(
      n.preStatements
    )} ${generateWat(n.value)})`;
  } else if (node.type === "LocalSet") {
    const n = node as WasmLocalSet;
    return `(local.set $${n.name}${getPreStatementsStr(
      n.preStatements
    )} ${generateWat(n.value)})`;
  } else if (node.type === "FunctionCallStatement") {
    const n = node as WasmFunctionCallStatement;
    return `(call $${n.name} ${generateStatementsList(
      n.stackFrameSetup
    )}) ${generateStatementsList(n.stackFrameTearDown)}`;
  } else if (node.type === "RegularFunctionCallStatement") {
    const n = node as WasmRegularFunctionCallStatement;
    return `(call $${n.name} ${generateArgString(n.args)})`;
  } else if (node.type === "SelectStatement") {
    const n = node as WasmSelectStatement;
    return `(if ${generateWat(n.condition)} (then ${n.actions
      .map((action) => generateWat(action))
      .join(" ")})${
      n.elseStatements.length > 0
        ? " (else" +
          n.elseStatements
            .map((statement) => generateWat(statement))
            .join(" ") +
          ")"
        : ""
    })`;
  } else if (node.type === "ReturnStatement") {
    return `(return)`;
  } else if (node.type === "Loop") {
    const n = node as WasmLoop;
    return `(loop $${n.label}${
      n.body.length > 0
        ? " " + n.body.map((line) => generateWat(line)).join(" ")
        : ""
    })`;
  } else if (node.type === "Block") {
    const n = node as WasmBlock;
    return `(block $${n.label}${
      n.body.length > 0
        ? " " + n.body.map((line) => generateWat(line)).join(" ")
        : ""
    })`;
  } else if (node.type === "Branch") {
    const n = node as WasmBranch;
    return `(br $${n.label})`;
  } else if (node.type === "BranchIf") {
    const n = node as WasmBranchIf;
    return `(br_if $${n.label} ${generateWat(n.condition)})`;
  } else if (node.type === "MemoryGrow") {
    const n = node as WasmMemoryGrow;
    return `(drop (memory.grow ${generateWat(n.pagesToGrowBy)}))`;
  } else if (node.type === "MemoryStore") {
    const n = node as WasmMemoryStore;
    return `(${getWasmMemoryStoreInstruction(
      n.wasmVariableType,
      n.numOfBytes
    )}${getPreStatementsStr(n.preStatements)} ${generateWat(
      n.addr
    )} ${generateWat(n.value)})`;
  } else if (node.type === "RegularFunctionCall") {
    const n = node as WasmRegularFunctionCall;
    return `(call $${n.name}${
      n.args.length > 0
        ? " " + n.args.map((arg) => generateWat(arg)).join(" ")
        : ""
    })`;
  }
  if (node.type === "FunctionCall") {
    const e = node as WasmFunctionCall;
    return `(call $${e.name} ${generateStatementsList(
      e.stackFrameSetup
    )}) ${generateStatementsList(e.stackFrameTearDown)}`;
  } else if (node.type === "RegularFunctionCall") {
    const e = node as WasmRegularFunctionCall;
    return `(call $${e.name} ${generateArgString(e.args)})`;
  } else if (node.type === "IntegerConst") {
    const e = node as WasmIntegerConst;
    return `(${e.wasmVariableType}.const ${e.value.toString()})`;
  } else if (node.type === "FloatConst") {
    const e = node as WasmFloatConst;
    let valueStr = e.value.toString();
    if (e.value === Infinity) {
      // special handling for infinity values
      valueStr = "inf";
    }
    return `(${e.wasmVariableType}.const ${valueStr})`;
  } else if (node.type === "LocalGet") {
    const e = node as WasmLocalGet;
    return `(local.get $${e.name}${getPreStatementsStr(e.preStatements)})`;
  } else if (node.type === "GlobalGet") {
    const e = node as WasmGlobalGet;
    return `(global.get $${e.name}${getPreStatementsStr(e.preStatements)})`;
  } else if (node.type === "BinaryExpression") {
    const e = node as WasmBinaryExpression;
    return `(${e.instruction} ${generateWat(e.leftExpr)} ${generateWat(
      e.rightExpr
    )})`;
  } else if (node.type === "BooleanExpression") {
    const e = node as WasmBooleanExpression;
    // TODO: need to know type of the variable to set the correct instruction
    if (e.isNegated) {
      return `(${e.expr.wasmVariableType}.eq (${e.expr.wasmVariableType}.const 0) ${generateWat(e.expr)})`;
    } else {
      return `(${e.expr.wasmVariableType}.ne (${e.expr.wasmVariableType}.const 0) ${generateWat(e.expr)})`;
    }
  } else if (node.type === "MemorySize") {
    return "(memory.size)";
  } else if (node.type === "MemoryLoad") {
    const n = node as WasmMemoryLoad;
    return `(${getWasmMemoryLoadInstruction(
      n.wasmVariableType,
      n.numOfBytes
    )}${getPreStatementsStr(n.preStatements)} ${generateWat(n.addr)})`;
  } else if (node.type === "MemoryStore") {
    return generateWat(node);
  } else if (node.type === "NumericWrapper") {
    const n = node as WasmNumericConversionWrapper;
    return `(${n.instruction} ${generateWat(n.expr)})`;
  } else if (node.type === "NegateFloatExpression") {
    const n = node as WasmNegateFloatExpression;
    return `(${n.wasmVariableType}.neg ${n.expr})`
  } else {
    throw new WatGeneratorError(`Unhandled WAT AST node: ${toJson(node)}`);
  }
}
