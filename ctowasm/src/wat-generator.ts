/**
 * Exports a generate function for generating a WAT string from WAT AST.
 */

import {
  WasmExpression,
  WasmFunctionBodyLine,
  WasmModule,
} from "wasm-ast/wasm-nodes";

/**
 * Function that returns a line in wat file with given level of identation & ending with newline.
 */
function generateLine(line: string, indentation: number) {
  return "\t".repeat(indentation) + line + "\n";
}

/**
 * Function that takes a block of strings (newline separated lines) and indents them with given indentation.
 */
function generateBlock(block: string, indentation: number) {
  let watStr = "";
  for (const line of block.split("\n")) {
    watStr += generateLine(line, indentation);
  }
  return watStr;
}

/**
 * Returns string of argument expressions that are provided to function calls, or certain instructions like add.
 * Basically any instruction that needs to read multiple variables from the stack can use this function to conveniently attach all
 * the subexpressions that form the stack values.
 */
function generateArgString(exprs: WasmExpression[]) {
  let argsStr = "";
  for (const arg of exprs) {
    argsStr += generateExprStr(arg) + " ";
  }
  return argsStr.trim();
}

/**
 * Given a wat Expression node, generates the string version of that expression, with brackets.
 */
function generateExprStr(expr: WasmExpression): string {
  if (expr.type === "FunctionCall") {
    return `(call $${expr.name} ${generateArgString(expr.args)})`;
  } else if (expr.type === "Const") {
    return `(${expr.variableType}.const ${expr.value.toString()})`;
  } else if (expr.type === "LocalGet") {
    const preStatements = expr.preStatements ? expr.preStatements.map(s => generateStatementStr(s)?? generateExprStr(s)) : [];
    return `(local.get $${expr.name} ${preStatements.join(" ")})`;
  } else if (expr.type === "GlobalGet") {
    return `(global.get $${expr.name})`;
  } else if (expr.type === "AddExpression") {
    //TODO: support different op types other than i32
    return `(i32.add ${generateExprStr(expr.leftExpr)} ${generateExprStr(
      expr.rightExpr
    )})`;
  } else if (expr.type === "SubtractExpression") {
    //TODO: support different op types other than i32
    return `(i32.sub ${generateExprStr(expr.leftExpr)} ${generateExprStr(
      expr.rightExpr
    )})`;
  } else if (expr.type === "MultiplyExpression") {
    //TODO: support different op types other than i32
    return `(i32.mul ${generateExprStr(expr.leftExpr)} ${generateExprStr(
      expr.rightExpr
    )})`;
  } else if (expr.type === "DivideExpression") {
    //TODO: support different op types other than i32 unsigned
    return `(i32.div_u ${generateExprStr(expr.leftExpr)} ${generateExprStr(
      expr.rightExpr
    )})`;
  } else if (expr.type === "RemainderExpression") {
    //TODO: support different op types other than i32 unsigned
    return `(i32.rem_u ${generateExprStr(expr.leftExpr)} ${generateExprStr(
      expr.rightExpr
    )})`;
  } else if (expr.type === "LocalSet" || expr.type === "GlobalSet") {
    return generateStatementStr(expr);
  } else {
    const ensureAllCasesHandled: never = expr; // simple compile time check that all cases are handled and expr is never
  }
}

/**
 * Generates the WAT line for a given statement present in a function.
 */
function generateStatementStr(statement: WasmFunctionBodyLine): string {
  if (statement.type === "GlobalSet") {
    return `(global.set $${statement.name} ${generateExprStr(
      statement.value
    )})`;
  } else if (statement.type === "LocalSet") {
    return `(local.set $${statement.name} ${generateExprStr(statement.value)})`;
  } else if (
    statement.type === "FunctionCall" ||
    statement.type === "GlobalGet" ||
    statement.type === "Const" ||
    statement.type === "LocalGet"
  ) {
    return generateExprStr(statement);
  }
  return "";
}

export function generateWAT(module: WasmModule, baseIndentation: number = 0) {
  let watStr = generateLine("(module", baseIndentation);
  for (const global of module.globals) {
    // add all the global variables first
    watStr += generateLine(
      `(global $${global.name} (${global.isConst ? "" : "mut"} ${
        global.variableType
      }) ${
        global.initializerValue ? generateExprStr(global.initializerValue) : ""
      })`,
      1
    );
  }
  for (const func of module.functions) {
    watStr += generateLine(`(func $${func.name}`, baseIndentation + 1);
    // write in all params line by line
    for (const param of Object.keys(func.params)) {
      watStr += generateLine(
        `(param $${param} ${func.params[param].variableType})`,
        baseIndentation + 2
      );
    }
    // write the result type
    if (func.return) {
      watStr += generateLine(`(result ${func.return})`, baseIndentation + 2);
    }
    // write in the locals
    for (const local of Object.keys(func.locals)) {
      watStr += generateLine(
        `(local $${local} ${func.locals[local].variableType})`,
        baseIndentation + 2
      );
    }
    for (const statement of func.body) {
      watStr += generateLine(
        generateStatementStr(statement),
        baseIndentation + 2
      );
    }
    watStr += generateLine(")", baseIndentation + 1);
  }
  watStr += generateLine("(start $main)", 1);
  watStr += generateLine(")", 0);
  return watStr;
}
