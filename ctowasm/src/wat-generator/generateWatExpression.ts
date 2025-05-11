import { WatGeneratorError, toJson } from "~src/errors";
import { WasmExpression } from "~src/translator/wasm-ast/core";
import {
  generateStatementsList,
  getWasmMemoryLoadInstruction,
} from "~src/wat-generator/util";

export default function generateWatExpression(node: WasmExpression): string {
  if (node.type === "IntegerConst") {
    return `(${node.wasmDataType}.const ${node.value.toString()})`;
  } else if (node.type === "FloatConst") {
    let valueStr = node.value.toString();
    if (node.value === Infinity) {
      // special handling for infinity values
      valueStr = "inf";
    }
    return `(${node.wasmDataType}.const ${valueStr})`;
  } else if (node.type === "LocalGet") {
    return `(local.get $${node.name}})`;
  } else if (node.type === "GlobalGet") {
    return `(global.get $${node.name})`;
  } else if (node.type === "BinaryExpression") {
    return `(${node.instruction} ${generateWatExpression(
      node.leftExpr,
    )} ${generateWatExpression(node.rightExpr)})`;
  } else if (node.type === "BooleanExpression") {
    if (node.isNegated) {
      return `(${node.wasmDataType}.eq (${
        node.wasmDataType
      }.const 0) ${generateWatExpression(node.expr)})`;
    } else {
      return `(${node.wasmDataType}.ne (${
        node.wasmDataType
      }.const 0) ${generateWatExpression(node.expr)})`;
    }
  } else if (node.type === "MemorySize") {
    return "(memory.size)";
  } else if (node.type === "MemoryLoad") {
    return `(${getWasmMemoryLoadInstruction(
      node.wasmDataType,
      node.numOfBytes,
    )} ${generateWatExpression(node.addr)})`;
  } else if (node.type === "NumericWrapper") {
    return `(${node.instruction} ${generateWatExpression(node.expr)})`;
  } else if (node.type === "NegateFloatExpression") {
    return `(${node.wasmDataType}.neg ${generateWatExpression(node.expr)})`;
  } else if (node.type === "PostStatementExpression") {
    return `${generateWatExpression(node.expr)} ${generateStatementsList(
      node.statements,
    )}`;
  } else if (node.type === "PreStatementExpression") {
    return `${generateStatementsList(node.statements)} ${generateWatExpression(
      node.expr,
    )}`;
  } else if (node.type === "ConditionalExpression") {
    return `(if (result ${node.wasmDataType}) ${generateWatExpression(
      node.condition,
    )} (then ${generateWatExpression(
      node.trueExpression,
    )}) (else ${generateWatExpression(node.falseExpression)}))`;
  } else {
    throw new WatGeneratorError(`Unhandled WAT AST node: ${toJson(node)}`);
  }
}
