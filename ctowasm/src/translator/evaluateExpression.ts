/**
 * Defines functions for evaluating C AST expression nodes and converting them to corresponding WAT AST nodes.
 */

import {
  ArithmeticExpression,
  ComparisonExpression,
  Expression,
  ConditionalExpression,
  Integer,
  FunctionCall,
  VariableExpr,
  PrefixExpression,
  PostfixExpression,
  AssignmentExpression,
  CompoundAssignmentExpression,
  ArrayElementExpr,
} from "~src/c-ast/root";
import { getVariableSize } from "~src/common/utils";
import {
  getFunctionCallStackFrameSetupStatements,
  getFunctionStackFrameTeardownStatements,
} from "~src/translator/memoryUtils";
import { unaryOperatorToBinaryOperator } from "~src/translator/util";
import {
  convertLiteralToConst,
  variableTypeToWasmType,
  getVariableOrArrayExprAddr,
  getVariableAddr,
  getArrayElementAddr,
} from "~src/translator/variableUtil";
import {
  WasmFunction,
  WasmExpression,
  WasmMemoryLoad,
  WasmMemoryStore,
  WasmModule,
} from "~src/wasm-ast/wasm-nodes";

/**
 * Function to evaluate a binary expression node, evaluating and building wasm nodes
 * of all the subexpressions of the ArithmeticExpression.
 * TODO: support different type of ops other than i32 ops.
 */
function evaluateLeftToRightBinaryExpression(
  wasmRoot: WasmModule,
  node: ArithmeticExpression | ComparisonExpression,
  enclosingFunc: WasmFunction
) {
  const rootNode: any = { type: node.type };
  // the last expression in expression series will be considered right expression (we do this to ensure left-to-rigth evaluation )
  let currNode = rootNode;
  for (let i = node.exprs.length - 1; i > 0; --i) {
    currNode.operator = node.exprs[i].operator;
    currNode.rightExpr = evaluateExpression(
      wasmRoot,
      node.exprs[i].expr,
      enclosingFunc
    );
    currNode.leftExpr = { type: node.type };
    currNode = currNode.leftExpr;
  }
  currNode.operator = node.exprs[0].operator;
  currNode.rightExpr = evaluateExpression(
    wasmRoot,
    node.exprs[0].expr,
    enclosingFunc
  );
  currNode.leftExpr = evaluateExpression(
    wasmRoot,
    node.firstExpr,
    enclosingFunc
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
  enclosingFunc: WasmFunction
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
        enclosingFunc
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
      enclosingFunc
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
      enclosingFunc
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
  enclosingFunc: WasmFunction
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
        functionArgs
      ),
      stackFrameTearDown: getFunctionStackFrameTeardownStatements(
        wasmRoot.functions[n.name],
        true
      ),
    };
  } else if (expr.type === "VariableExpr") {
    const n = expr as VariableExpr;
    // the expression is a function parameter OR a local variable
    return {
      type: "MemoryLoad",
      addr: getVariableAddr(wasmRoot, n.name, enclosingFunc),
      varType: variableTypeToWasmType[n.variableType],
      numOfBytes: getVariableSize(n.variableType),
    };
  } else if (
    expr.type === "ArithmeticExpression" ||
    expr.type === "ComparisonExpression"
  ) {
    const n = expr as ArithmeticExpression | ComparisonExpression;
    return evaluateLeftToRightBinaryExpression(wasmRoot, n, enclosingFunc);
  } else if (expr.type === "PrefixExpression") {
    const n: PrefixExpression = expr as PrefixExpression;
    const addr = getVariableOrArrayExprAddr(
      wasmRoot,
      n.variable,
      enclosingFunc
    );
    const wasmNode: WasmMemoryLoad = {
      type: "MemoryLoad",
      addr,
      preStatements: [
        {
          type: "MemoryStore",
          addr,
          value: {
            type: "ArithmeticExpression",
            operator: unaryOperatorToBinaryOperator[n.operator],
            leftExpr: {
              type: "MemoryLoad",
              addr,
              varType: variableTypeToWasmType[n.variable.variableType],
              numOfBytes: getVariableSize(n.variable.variableType),
            },
            rightExpr: {
              type: "Const",
              variableType: "i32",
              value: 1,
            },
            varType: "i32",
          },
          varType: variableTypeToWasmType[n.variable.variableType],
          numOfBytes: getVariableSize(n.variable.variableType),
        },
      ],
      varType: variableTypeToWasmType[n.variable.variableType],
      numOfBytes: getVariableSize(n.variable.variableType),
    };
    return wasmNode;
  } else if (expr.type === "PostfixExpression") {
    const n: PostfixExpression = expr as PostfixExpression;
    const addr = getVariableOrArrayExprAddr(
      wasmRoot,
      n.variable,
      enclosingFunc
    );
    const wasmNode: WasmMemoryStore = {
      type: "MemoryStore",
      addr,
      value: {
        type: "ArithmeticExpression",
        operator: unaryOperatorToBinaryOperator[n.operator],
        leftExpr: {
          type: "MemoryLoad",
          addr,
          varType: variableTypeToWasmType[n.variable.variableType],
          numOfBytes: getVariableSize(n.variable.variableType),
        },
        rightExpr: {
          type: "Const",
          variableType: "i32",
          value: 1,
        },
        varType: "i32",
      },
      varType: variableTypeToWasmType[n.variable.variableType],
      numOfBytes: getVariableSize(n.variable.variableType),
      // load the original value of the variable onto wasm stack first
      preStatements: [
        {
          type: "MemoryLoad",
          addr,
          varType: variableTypeToWasmType[n.variable.variableType],
          numOfBytes: getVariableSize(n.variable.variableType),
        },
      ],
    };
    return wasmNode;
  } else if (expr.type === "ConditionalExpression") {
    const n = expr as ConditionalExpression;
    return evaluateConditionalExpression(wasmRoot, n, enclosingFunc);
  } else if (expr.type === "AssignmentExpression") {
    const n = expr as AssignmentExpression;
    const addr = getVariableOrArrayExprAddr(
      wasmRoot,
      n.variable,
      enclosingFunc
    );
    return {
      type: "MemoryLoad",
      addr,
      preStatements: [
        {
          type: "MemoryStore",
          addr,
          value: evaluateExpression(wasmRoot, n.value, enclosingFunc),
          varType: variableTypeToWasmType[n.variable.variableType],
          numOfBytes: getVariableSize(n.variable.variableType),
        },
      ],
      varType: variableTypeToWasmType[n.variable.variableType],
      numOfBytes: getVariableSize(n.variable.variableType),
    };
  } else if (expr.type === "CompoundAssignmentExpression") {
    const n = expr as CompoundAssignmentExpression;
    const addr = getVariableOrArrayExprAddr(
      wasmRoot,
      n.variable,
      enclosingFunc
    );
    return {
      type: "MemoryLoad",
      addr,
      preStatements: [
        {
          type: "MemoryStore",
          addr,
          value: {
            type: "ArithmeticExpression",
            operator: n.operator,
            leftExpr: {
              type: "MemoryLoad",
              addr,
              varType: variableTypeToWasmType[n.variable.variableType],
              numOfBytes: getVariableSize(n.variable.variableType),
            },
            rightExpr: evaluateExpression(wasmRoot, n.value, enclosingFunc),
            varType: variableTypeToWasmType[n.variable.variableType],
          },
          varType: variableTypeToWasmType[n.variable.variableType],
          numOfBytes: getVariableSize(n.variable.variableType),
        },
      ],
      varType: variableTypeToWasmType[n.variable.variableType],
      numOfBytes: getVariableSize(n.variable.variableType),
    };
  } else if (expr.type === "ArrayElementExpr") {
    const n = expr as ArrayElementExpr;
    // the expression is a function parameter OR a local variable
    return {
      type: "MemoryLoad",
      addr: getArrayElementAddr(
        wasmRoot,
        n.arrayName,
        n.index,
        getVariableSize(n.variableType),
        enclosingFunc
      ),
      varType: variableTypeToWasmType[n.variableType],
      numOfBytes: getVariableSize(n.variableType),
    };
  } else {
    console.assert(
      false,
      `WASM TRANSLATION ERROR: Unhandled C expression node\n${JSON.stringify(
        expr
      )}`
    );
  }
}
