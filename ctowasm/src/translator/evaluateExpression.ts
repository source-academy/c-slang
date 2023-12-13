/**
 * Defines functions for evaluating C AST expression nodes and converting them to corresponding WAT AST nodes.
 */
import {
  ArithmeticExpression,
  PrefixExpression,
  PostfixExpression,
  CompoundAssignmentExpression,
} from "~src/c-ast/arithmetic";
import { ArrayElementExpr } from "~src/c-ast/arrays";
import { AssignmentExpression } from "~src/c-ast/assignment";
import {
  ComparisonExpression,
  ConditionalExpression,
} from "~src/c-ast/boolean";
import { FunctionCall } from "~src/c-ast/functions";
import { Integer } from "~src/c-ast/literals";
import { Expression } from "~src/c-ast/core";
import { VariableExpr } from "~src/c-ast/variable";
import {
  getFunctionCallStackFrameSetupStatements,
  getFunctionStackFrameTeardownStatements,
} from "~src/translator/memoryUtil";
import { unaryOperatorToBinaryOperator } from "~src/translator/util";
import {
  convertLiteralToConst,
  getMemoryAccessDetails,
} from "~src/translator/variableUtil";
import { WasmFunction } from "~src/wasm-ast/functions";
import { WasmMemoryLoad, WasmMemoryStore } from "~src/wasm-ast/memory";
import { WasmModule, WasmExpression } from "~src/wasm-ast/core";

/**
 * Function to evaluate a binary expression node, evaluating and building wasm nodes
 * of all the subexpressions of the ArithmeticExpression.
 * TODO: support different type of ops other than i32 ops.
 */
function evaluateLeftToRightBinaryExpression(
  wasmRoot: WasmModule,
  node: ArithmeticExpression | ComparisonExpression,
  enclosingFunc: WasmFunction,
) {
  const rootNode: any = { type: node.type };
  // the last expression in expression series will be considered right expression (we do this to ensure left-to-rigth evaluation )
  let currNode = rootNode;
  for (let i = node.exprs.length - 1; i > 0; --i) {
    currNode.operator = node.exprs[i].operator;
    currNode.rightExpr = evaluateExpression(
      wasmRoot,
      node.exprs[i].expr,
      enclosingFunc,
    );
    currNode.leftExpr = { type: node.type };
    currNode = currNode.leftExpr;
  }
  currNode.operator = node.exprs[0].operator;
  currNode.rightExpr = evaluateExpression(
    wasmRoot,
    node.exprs[0].expr,
    enclosingFunc,
  );
  currNode.leftExpr = evaluateExpression(
    wasmRoot,
    node.firstExpr,
    enclosingFunc,
  );
  return rootNode;
}

function isConditionalExpression(node: Expression) {
  return node.type === "ConditionalExpression";
}

/**
 * Produces the correct left to right evaluation of a conditional expression,
 * in terms of WasmOrExpression or WasmAndExpression.
 */
function evaluateConditionalExpression(
  wasmRoot: WasmModule,
  node: ConditionalExpression,
  enclosingFunc: WasmFunction,
) {
  const wasmNodeType =
    node.conditionType === "or" ? "OrExpression" : "AndExpression";
  const rootNode: any = { type: wasmNodeType };
  // the last expression in expression series will be considered right expression (we do this to ensure left-to-rigth evaluation )
  // each expression must be converted into a boolean expression
  let currNode = rootNode;
  for (let i = node.exprs.length - 1; i > 1; --i) {
    if (isConditionalExpression(node.exprs[i])) {
      // no need to wrap inside a BooleanExpression if it was already a conditional expression
      currNode.rightExpr = evaluateExpression(
        wasmRoot,
        node.exprs[i],
        enclosingFunc,
      );
    } else {
      currNode.rightExpr = {
        type: "BooleanExpression",
        expr: evaluateExpression(wasmRoot, node.exprs[i], enclosingFunc),
      };
    }
    currNode.leftExpr = { type: wasmNodeType };
    currNode = currNode.leftExpr;
  }
  if (isConditionalExpression(node.exprs[1])) {
    // no need to wrap inside a BooleanExpression if it was already a conditional expression
    currNode.rightExpr = evaluateExpression(
      wasmRoot,
      node.exprs[1],
      enclosingFunc,
    );
  } else {
    currNode.rightExpr = {
      type: "BooleanExpression",
      expr: evaluateExpression(wasmRoot, node.exprs[1], enclosingFunc),
    };
  }

  if (isConditionalExpression(node.exprs[0])) {
    currNode.leftExpr = evaluateExpression(
      wasmRoot,
      node.exprs[0],
      enclosingFunc,
    );
  } else {
    currNode.leftExpr = {
      type: "BooleanExpression",
      expr: evaluateExpression(wasmRoot, node.exprs[0], enclosingFunc),
    };
  }
  return rootNode;
}

/**
 * Function that evaluates a given C expression and returns the corresponding WASM expression.
 */
export default function evaluateExpression(
  wasmRoot: WasmModule,
  expr: Expression,
  enclosingFunc: WasmFunction,
): WasmExpression {
  if (expr.type === "Integer") {
    const n = expr as Integer;
    return convertLiteralToConst(n);
  } else if (expr.type === "FunctionCall") {
    const n = expr as FunctionCall;
    // load the return from its region in memory
    // TODO: need to do multiple loads interspaced with stores to support structs later on
    // evaluate all the expressions used as arguments
    const functionArgs = [];
    for (const arg of n.args) {
      functionArgs.push(evaluateExpression(wasmRoot, arg, enclosingFunc));
    }
    return {
      type: "FunctionCall",
      name: n.name,
      stackFrameSetup: getFunctionCallStackFrameSetupStatements(
        wasmRoot.functions[n.name],
        functionArgs,
      ),
      stackFrameTearDown: getFunctionStackFrameTeardownStatements(
        wasmRoot.functions[n.name],
        true,
      ),
    };
  } else if (expr.type === "VariableExpr" || expr.type === "ArrayElementExpr") {
    const n = expr as VariableExpr | ArrayElementExpr;
    const memoryAccessDetails = getMemoryAccessDetails(
      wasmRoot,
      n,
      enclosingFunc,
    );
    return {
      type: "MemoryLoad",
      ...memoryAccessDetails,
    };
  } else if (
    expr.type === "ArithmeticExpression" ||
    expr.type === "ComparisonExpression"
  ) {
    const n = expr as ArithmeticExpression | ComparisonExpression;
    return evaluateLeftToRightBinaryExpression(wasmRoot, n, enclosingFunc);
  } else if (expr.type === "PrefixExpression") {
    const n: PrefixExpression = expr as PrefixExpression;
    const memoryAccessDetails = getMemoryAccessDetails(
      wasmRoot,
      n.variable,
      enclosingFunc,
    );
    const wasmNode: WasmMemoryLoad = {
      type: "MemoryLoad",
      preStatements: [
        {
          type: "MemoryStore",

          value: {
            type: "ArithmeticExpression",
            operator: unaryOperatorToBinaryOperator[n.operator],
            leftExpr: {
              type: "MemoryLoad",
              ...memoryAccessDetails,
            },
            rightExpr: {
              type: "Const",
              variableType: "i32",
              value: 1,
            },
            varType: "i32",
          },
          ...memoryAccessDetails,
        },
      ],
      ...memoryAccessDetails,
    };
    return wasmNode;
  } else if (expr.type === "PostfixExpression") {
    const n: PostfixExpression = expr as PostfixExpression;
    const memoryAccessDetails = getMemoryAccessDetails(
      wasmRoot,
      n.variable,
      enclosingFunc,
    );
    const wasmNode: WasmMemoryStore = {
      type: "MemoryStore",
      value: {
        type: "ArithmeticExpression",
        operator: unaryOperatorToBinaryOperator[n.operator],
        leftExpr: {
          type: "MemoryLoad",
          ...memoryAccessDetails,
        },
        rightExpr: {
          type: "Const",
          variableType: "i32",
          value: 1,
        },
        varType: "i32",
      },
      preStatements: [
        {
          type: "MemoryLoad",
          ...memoryAccessDetails,
        },
      ],
      ...memoryAccessDetails,
    };
    return wasmNode;
  } else if (expr.type === "ConditionalExpression") {
    const n = expr as ConditionalExpression;
    return evaluateConditionalExpression(wasmRoot, n, enclosingFunc);
  } else if (expr.type === "AssignmentExpression") {
    const n = expr as AssignmentExpression;
    const memoryAccessDetails = getMemoryAccessDetails(
      wasmRoot,
      n.variable,
      enclosingFunc,
    );
    return {
      type: "MemoryLoad",
      preStatements: [
        {
          type: "MemoryStore",
          value: evaluateExpression(wasmRoot, n.value, enclosingFunc),
          ...memoryAccessDetails,
        },
      ],
      ...memoryAccessDetails,
    };
  } else if (expr.type === "CompoundAssignmentExpression") {
    const n = expr as CompoundAssignmentExpression;
    const memoryAccessDetails = getMemoryAccessDetails(
      wasmRoot,
      n.variable,
      enclosingFunc,
    );
    return {
      type: "MemoryLoad",
      preStatements: [
        {
          type: "MemoryStore",
          value: {
            type: "ArithmeticExpression",
            operator: n.operator,
            leftExpr: {
              type: "MemoryLoad",
              ...memoryAccessDetails,
            },
            rightExpr: evaluateExpression(wasmRoot, n.value, enclosingFunc),
            varType: memoryAccessDetails.varType,
          },
          ...memoryAccessDetails,
        },
      ],
      ...memoryAccessDetails,
    };
  } else {
    console.assert(
      false,
      `WASM TRANSLATION ERROR: Unhandled C expression node\n${JSON.stringify(
        expr,
      )}`,
    );
  }
}
