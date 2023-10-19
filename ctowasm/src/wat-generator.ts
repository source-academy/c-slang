/**
 * Exports a generate function for generating a WAT string from WAT AST.
 */
import { BinaryOperator, ComparisonOperator } from "c-ast/c-nodes";
import { functionStackFrameTeardownStatements } from "constant";

import {
  WasmAndExpression,
  WasmArithmeticExpression,
  WasmBlock,
  WasmBooleanExpression,
  WasmBranch,
  WasmBranchIf,
  WasmComparisonExpression,
  WasmConst,
  WasmExpression,
  WasmFunctionBodyLine,
  WasmFunctionCall,
  WasmFunctionCallStatement,
  WasmGlobalGet,
  WasmGlobalSet,
  WasmLocalGet,
  WasmLocalSet,
  WasmLocalTee,
  WasmLog,
  WasmLoop,
  WasmMemoryGrow,
  WasmMemoryLoad,
  WasmMemoryStore,
  WasmModule,
  WasmOrExpression,
  WasmReturnStatement,
  WasmSelectStatement,
  WasmStatement,
  WasmType,
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
 * Returns the approprite memory instruction for a memory load.
 * TODO: support unsigned types in future.
 */
function getWasmMemoryLoadInstruction(varType: WasmType, numOfBytes: number) {
  if (
    ((varType === "i32" || varType === "f32") && numOfBytes === 4) ||
    ((varType === "i64" || varType === "f64") && numOfBytes === 8)
  ) {
    return `${varType}.load`;
  }
  return `${varType}.load${numOfBytes.toString()}_s`;
}

function getWasmMemoryStoreInstruction(varType: WasmType, numOfBytes: number) {
  if (
    ((varType === "i32" || varType === "f32") && numOfBytes === 4) ||
    ((varType === "i64" || varType === "f64") && numOfBytes === 8)
  ) {
    return `${varType}.store`;
  }
  return `${varType}.store${numOfBytes.toString()}`;
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

const stackFrameTeardownStatements = functionStackFrameTeardownStatements
  .map((s) => generateStatementStr(s))
  .join(" ");

/**
 * Returns the correct WAT binary instruction, given a binary operator.
 * TODO: add support for other types and unsigned/signed ints.
 */
function getBinaryInstruction(operator: BinaryOperator | ComparisonOperator) {
  switch (operator) {
    case "+":
      return "i32.add";
    case "-":
      return "i32.sub";
    case "*":
      return "i32.mul";
    case "/":
      return "i32.div_s";
    case "%":
      return "i32.rem_s";
    case "<":
      return "i32.lt_s";
    case "<=":
      return "i32.le_s";
    case "!=":
      return "i32.ne";
    case "==":
      return "i32.eq";
    case ">=":
      return "i32.ge_s";
    case ">":
      return "i32.gt_s";
  }
}

function getPreStatementsStr(preStatements?: (WasmStatement | WasmExpression)[]) {
  const s = preStatements
  ? preStatements.map(
      (s) => generateStatementStr(s) ?? generateExprStr(s as WasmExpression)
    )
  : [];
  return s.length > 0 ? " " + s.join(" ") : ""
}

/**
 * Given a wat Expression node, generates the string version of that expression, with brackets.
 */
function generateExprStr(expr: WasmExpression): string {
  if (expr.type === "FunctionCall") {
    const e = expr as WasmFunctionCall;
    return `(call $${e.name} ${e.stackFrameSetup
      .map((s) => generateStatementStr(s))
      .join(" ")}) ${stackFrameTeardownStatements}`;
  } else if (expr.type === "Const") {
    const e = expr as WasmConst;
    return `(${e.variableType}.const ${e.value.toString()})`;
  } else if (expr.type === "LocalGet") {
    const e = expr as WasmLocalGet;
    return `(local.get $${e.name}${
      getPreStatementsStr(e.preStatements)
    })`;
  } else if (expr.type === "GlobalGet") {
    const e = expr as WasmGlobalGet;
    return `(global.get $${e.name}${
      getPreStatementsStr(e.preStatements)
    })`;
  } else if (
    expr.type === "ArithmeticExpression" ||
    expr.type === "ComparisonExpression"
  ) {
    const e = expr as WasmArithmeticExpression | WasmComparisonExpression;
    //TODO: support different op types other than i32
    return `(${getBinaryInstruction(e.operator)} ${generateExprStr(
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
  } else if (expr.type === "AndExpression") {
    const e = expr as WasmAndExpression;
    return `(i32.and ${generateExprStr(e.leftExpr)} ${generateExprStr(
      e.rightExpr
    )})`;
  } else if (expr.type === "OrExpression") {
    const e = expr as WasmOrExpression;
    return `(i32.or ${generateExprStr(e.leftExpr)} ${generateExprStr(
      e.rightExpr
    )})`;
  } else if (expr.type === "LocalTee") {
    const n = expr as WasmLocalTee;
    return `(local.tee $${n.name} ${generateExprStr(n.value)})`;
  } else if (expr.type === "MemorySize") {
    return "(memory.size)";
  } else if (expr.type === "MemoryLoad") {
    const n = expr as WasmMemoryLoad;
    return `(${getWasmMemoryLoadInstruction(
      n.varType,
      n.numOfBytes
    )}${getPreStatementsStr(n.preStatements)} ${generateExprStr(expr.addr)})`;
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

/**
 * Generates the WAT line for a given statement present in a function.
 */
function generateStatementStr(statement: WasmFunctionBodyLine): string {
  if (statement.type === "GlobalSet") {
    const n = statement as WasmGlobalSet;
    return `(global.set $${n.name}${getPreStatementsStr(n.preStatements)} ${generateExprStr(n.value)})`;
  } else if (statement.type === "LocalSet") {
    const n = statement as WasmLocalSet;
    return `(local.set $${n.name}${getPreStatementsStr(n.preStatements)} ${generateExprStr(n.value)})`;
  } else if (statement.type === "FunctionCallStatement") {
    const n = statement as WasmFunctionCallStatement;
    if (n.hasReturn) {
      // need to drop the return of the statement from the stack
      return `(drop (call $${n.name} ${statement.stackFrameSetup
        .map((s) => generateStatementStr(s))
        .join(" ")}) ${stackFrameTeardownStatements})`;
    }
    return `(call $${n.name} ${statement.stackFrameSetup
      .map((s) => generateStatementStr(s))
      .join(" ")}) ${stackFrameTeardownStatements}`;
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
    const n = statement as WasmReturnStatement;
    return `(return ${generateExprStr(n.value)})`;
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
      n.numOfBytes
    )}${getPreStatementsStr(n.preStatements)} ${generateExprStr(n.addr)} ${generateExprStr(n.value)})`;
  } else if (statement.type === "Log") {
    const n = statement as WasmLog;
    return `(call $log ${generateExprStr(n.value)})`
  }
  return null;
}

export function generateWAT(module: WasmModule, baseIndentation: number = 0, testMode?: boolean) {
  let watStr = generateLine("(module", baseIndentation);

  // if in test mode, need to import the log function
  // TODO: add logging of vars other than i32
  if (testMode) {
    watStr += generateLine("(import \"console\" \"log\" (func $log (param i32)))", baseIndentation + 1);
  }
  // add the memory declaration
  watStr += generateLine(`(memory ${module.memorySize})`, baseIndentation + 1);

  for (const global of module.globalWasmVariables) {
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
  for (const functionName of Object.keys(module.functions)) {
    const func = module.functions[functionName];
    watStr += generateLine(`(func $${func.name}`, baseIndentation + 1);
    // write the result type
    if (func.return) {
      watStr += generateLine(`(result ${func.return})`, baseIndentation + 2);
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
