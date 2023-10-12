/**
 * Exports a translate function that takes a C AST and produces a webassembly AST
 */

import {
  Root,
  Node,
  FunctionDefinition,
  VariableType,
  VariableDeclaration,
  Initialization,
  Literal,
  Block,
  ReturnStatement,
  VariableExpr,
  Expression,
  FunctionCall,
  Assignment,
  ArithmeticExpression,
  PrefixExpression,
  PostfixExpression,
  FunctionCallStatement,
  ConditionalExpression,
  CompoundAssignment,
  BinaryOperator,
  ComparisonExpression,
  SelectStatement,
  AssignmentExpression,
} from "c-ast/c-nodes";
import {
  WasmArithmeticExpression,
  WasmConst,
  WasmExpression,
  WasmFunction,
  WasmGlobalGet,
  WasmGlobalSet,
  WasmGlobalVariable,
  WasmLocalGet,
  WasmLocalSet,
  WasmLocalVariable,
  WasmModule,
  WasmSelectStatement,
  WasmStatement,
  WasmType,
  WasmVariable,
} from "wasm-ast/wasm-nodes";

const PARAM_PREFIX = "param_";

export function translate(CAstRoot: Root) {
  const wasmRoot: WasmModule = {
    type: "Module",
    globals: [],
    functions: [],
  };

  /**
   * Converts a given variable name to a scoped variable name (meaning that scope information is included in the name itself).
   * This is to make up for wasm not having block scope. Thus we can have multiple vars of the same name (in C) in the same function
   * as long as they are in different blocks since their names in wat will be different.
   */
  function convertVarNameToScopedVarName(name: string, block: number) {
    return `${name}_${block.toString()}`;
  }

  /**
   * Returns the given function parameter name prefixed with "param_".
   */
  function generateParamName(name: string) {
    return PARAM_PREFIX + name;
  }

  const variableTypeToWasmType: Record<VariableType, WasmType> = {
    int: "i32",
  };

  /**
   * Converts a given Literal to a WasmConst
   */
  function convertLiteralToConst(literal: Literal): WasmConst {
    let type: WasmType;
    if (literal.type === "Integer") {
      type = "i32";
    }
    return {
      type: "Const",
      variableType: type,
      value: literal.value,
    };
  }

  /**
   * Function that finds out in which scope a variable that is being assigned to or used in an expression belongs in,
   * and generates the name of that variable accordingly.
   */
  function getWasmVariableName(
    originalVariableName: string,
    enclosingFunc: WasmFunction
  ) {
    for (let i = enclosingFunc.scopes.length - 1; i >= 0; --i) {
      if (enclosingFunc.scopes[i].has(originalVariableName)) {
        return convertVarNameToScopedVarName(originalVariableName, i);
      }
    }
    // check if variable is function parameter
    if (generateParamName(originalVariableName) in enclosingFunc.params) {
      return generateParamName(originalVariableName);
    }

    // if reach this point, variable must be a global variable
    return originalVariableName;
  }

  /**
   * Converts a given unary opeartor into the corresponding asm instruction node name.
   * TODO: add other type support
   */
  const unaryOperatorToBinaryOperator: Record<string, BinaryOperator> = {
    "++": "+",
    "--": "-",
  };

  function addStatement(
    n: WasmStatement,
    enclosingFunc: WasmFunction,
    enclosingBody?: WasmStatement[]
  ) {
    if (typeof enclosingBody !== "undefined") {
      enclosingBody.push(n);
    } else {
      enclosingFunc.body.push(n);
    }
  }

  /**
   * Function for visting the statements within a function body.
   * For now, expressions execpt function calls are ignored since they are inconsequential. TODO: check this
   * @param CAstNode Node being visited.
   * @param enclosingFunc The enclosing function within which we are visiting lines.
   * @param enclosingBody If provided, add the new statement to this enclosing body instead of then enclosing function
   */
  function visit(
    CAstNode: Node,
    enclosingFunc: WasmFunction,
    enclosingBody?: WasmStatement[]
  ) {
    if (CAstNode.type === "Block") {
      const n = CAstNode as Block;
      enclosingFunc.scopes.push(new Set()); // push on new scope for this block
      n.children.forEach((child) => visit(child, enclosingFunc, enclosingBody));
      enclosingFunc.scopes.pop(); // pop off the scope for this block
    } else if (CAstNode.type === "ReturnStatement") {
      const n = CAstNode as ReturnStatement;
      if (enclosingFunc.name !== "main") {
        // main shouldnt have any return for wasm
        addStatement(
          {
            type: "ReturnStatement",
            value: evaluateExpression(n.value, enclosingFunc),
          },
          enclosingFunc,
          enclosingBody
        );
      }
    } else if (CAstNode.type === "Initialization") {
      const n = CAstNode as Initialization;
      enclosingFunc.scopes[enclosingFunc.scopes.length - 1].add(n.name);
      const v: WasmLocalVariable = {
        type: "LocalVariable",
        name: convertVarNameToScopedVarName(
          n.name,
          enclosingFunc.scopes.length - 1
        ),
        variableType: variableTypeToWasmType[n.variableType],
      };
      enclosingFunc.locals[v.name] = v;
      addStatement(
        {
          type: "LocalSet",
          name: convertVarNameToScopedVarName(
            n.name,
            enclosingFunc.scopes.length - 1
          ),
          value: evaluateExpression(n.value, enclosingFunc),
        },
        enclosingFunc,
        enclosingBody
      );
    } else if (CAstNode.type === "VariableDeclaration") {
      const n = CAstNode as VariableDeclaration;
      enclosingFunc.scopes[enclosingFunc.scopes.length - 1].add(n.name);
      const localVar = {
        type: "LocalVariable",
        name: convertVarNameToScopedVarName(
          n.name,
          enclosingFunc.scopes.length - 1
        ),
        variableType: variableTypeToWasmType[n.variableType],
      };
      enclosingFunc.locals[localVar.name] = localVar;
    } else if (CAstNode.type === "Assignment") {
      const n = CAstNode as Assignment;
      const wasmVariableName = getWasmVariableName(
        n.variable.name,
        enclosingFunc
      );
      if (
        wasmVariableName in enclosingFunc.params ||
        wasmVariableName in enclosingFunc.locals
      ) {
        // parameter assignment or assignment to local scope variable
        addStatement(
          {
            type: "LocalSet",
            name: wasmVariableName,
            value: evaluateExpression(n.value, enclosingFunc),
          },
          enclosingFunc,
          enclosingBody
        );
      } else {
        // this assignment is to a global variable
        // no need do any checks, this would have been done in semantic analysis TODO: check this
        addStatement(
          {
            type: "GlobalSet",
            name: wasmVariableName,
            value: evaluateExpression(n.value, enclosingFunc),
          },
          enclosingFunc,
          enclosingBody
        );
      }
    } else if (CAstNode.type === "FunctionCallStatement") {
      // function calls are the only expression that are recognised as a statement
      const n = CAstNode as FunctionCallStatement;
      const args: WasmExpression[] = [];
      for (const arg of n.args) {
        args.push(evaluateExpression(arg, enclosingFunc));
      }
      addStatement(
        {
          type: "FunctionCallStatement",
          name: n.name,
          args,
          hasReturn: n.hasReturn,
        },
        enclosingFunc,
        enclosingBody
      );
    } else if (
      CAstNode.type === "PrefixExpression" ||
      CAstNode.type === "PostfixExpression"
    ) {
      // handle the case where a prefix or postfix expression is used as a statement, not an expression.
      const n = CAstNode as PrefixExpression | PostfixExpression;
      const wasmVariableName = getWasmVariableName(
        n.variable.name,
        enclosingFunc
      );
      let variableSetType: "GlobalSet" | "LocalSet" = "GlobalSet";
      let variableGetType: "GlobalGet" | "LocalGet" = "GlobalGet";
      if (
        wasmVariableName in enclosingFunc.params ||
        wasmVariableName in enclosingFunc.locals
      ) {
        variableSetType = "LocalSet";
        variableGetType = "LocalGet";
      }
      const varType = variableTypeToWasmType[n.variable.variableType];
      const localSet: WasmLocalSet | WasmGlobalSet = {
        type: variableSetType,
        name: wasmVariableName,
        value: {
          type: "ArithmeticExpression",
          operator: unaryOperatorToBinaryOperator[n.operator],
          leftExpr: {
            type: variableGetType,
            name: wasmVariableName,
          } as WasmLocalGet | WasmGlobalGet,
          rightExpr: {
            type: "Const",
            variableType: varType,
            value: 1,
          },
          varType: varType,
        },
      };
      addStatement(localSet, enclosingFunc, enclosingBody);
    } else if (CAstNode.type === "CompoundAssignment") {
      const n = CAstNode as CompoundAssignment;
      const wasmVariableName = getWasmVariableName(
        n.variable.name,
        enclosingFunc
      );
      if (
        wasmVariableName in enclosingFunc.params ||
        wasmVariableName in enclosingFunc.locals
      ) {
        const arithmeticExpr: WasmArithmeticExpression = {
          type: "ArithmeticExpression",
          operator: n.operator,
          varType: variableTypeToWasmType[n.variable.variableType],
          leftExpr: {
            type: "LocalGet",
            name: wasmVariableName,
          },
          rightExpr: evaluateExpression(n.value, enclosingFunc),
        };
        // parameter assignment or assignment to local scope variable
        enclosingFunc.body.push({
          type: "LocalSet",
          name: wasmVariableName,
          value: arithmeticExpr,
        });
      } else {
        const arithmeticExpr: WasmArithmeticExpression = {
          type: "ArithmeticExpression",
          operator: n.operator,
          varType: variableTypeToWasmType[n.variable.variableType],
          leftExpr: {
            type: "GlobalGet",
            name: wasmVariableName,
          },
          rightExpr: evaluateExpression(n.value, enclosingFunc),
        };
        addStatement(
          {
            type: "GlobalSet",
            name: wasmVariableName,
            value: arithmeticExpr,
          },
          enclosingFunc,
          enclosingBody
        );
      }
    } else if (CAstNode.type === "SelectStatement") {
      const n = CAstNode as SelectStatement;
      const actions: WasmStatement[] = [];
      visit(n.ifBlock.block, enclosingFunc, actions); // visit all the actions inside the if block
      const rootNode: WasmSelectStatement = {
        type: "SelectStatement",
        condition: evaluateExpression(n.ifBlock.condition, enclosingFunc),
        actions,
        elseStatements: [],
      };
      let currNode = rootNode;
      for (const elseIfBlock of n.elseIfBlocks) {
        const actions: WasmStatement[] = [];
        visit(elseIfBlock.block, enclosingFunc, actions);
        const elseIfNode: WasmSelectStatement = {
          type: "SelectStatement",
          condition: evaluateExpression(elseIfBlock.condition, enclosingFunc),
          actions,
          elseStatements: [],
        };
        currNode.elseStatements = [elseIfNode];
        currNode = elseIfNode;
      }
      if (n.elseBlock) {
        const elseActions: WasmStatement[] = [];
        visit(n.elseBlock, enclosingFunc, elseActions);
        currNode.elseStatements = elseActions;
      }
      addStatement(rootNode, enclosingFunc, enclosingBody);
    }
  }

  /**
   * Function to evaluate a binary expression node, evaluating and building wasm nodes
   * of all the subexpressions of the ArithmeticExpression.
   * TODO: support different type of ops other than i32 ops.
   */
  function evaluateLeftToRightBinaryExpression(
    node: ArithmeticExpression | ComparisonExpression,
    enclosingFunc: WasmFunction
  ) {
    const rootNode: any = { type: node.type };
    // the last expression in expression series will be considered right expression (we do this to ensure left-to-rigth evaluation )
    let currNode = rootNode;
    for (let i = node.exprs.length - 1; i > 0; --i) {
      currNode.operator = node.exprs[i].operator;
      currNode.rightExpr = evaluateExpression(
        node.exprs[i].expr,
        enclosingFunc
      );
      currNode.leftExpr = { type: node.type };
      currNode = currNode.leftExpr;
    }
    currNode.operator = node.exprs[0].operator;
    currNode.rightExpr = evaluateExpression(node.exprs[0].expr, enclosingFunc);
    currNode.leftExpr = evaluateExpression(node.firstExpr, enclosingFunc);
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
        currNode.rightExpr = evaluateExpression(node.exprs[i], enclosingFunc);
      } else {
        currNode.rightExpr = {
          type: "BooleanExpression",
          expr: evaluateExpression(node.exprs[i], enclosingFunc),
        };
      }
      currNode.leftExpr = { type: wasmNodeType };
      currNode = currNode.leftExpr;
    }
    if (isConditionalExpression(node.exprs[1])) {
      // no need to wrap inside a BooleanExpression if it was already a conditional expression
      currNode.rightExpr = evaluateExpression(node.exprs[1], enclosingFunc);
    } else {
      currNode.rightExpr = {
        type: "BooleanExpression",
        expr: evaluateExpression(node.exprs[1], enclosingFunc),
      };
    }

    if (isConditionalExpression(node.exprs[0])) {
      currNode.leftExpr = evaluateExpression(node.exprs[0], enclosingFunc);
    } else {
      currNode.leftExpr = {
        type: "BooleanExpression",
        expr: evaluateExpression(node.exprs[0], enclosingFunc),
      };
    }
    return rootNode;
  }

  /**
   * Function that evaluates a given C expression and returns the corresponding WASM expression.
   */
  function evaluateExpression(
    expr: Expression,
    enclosingFunc: WasmFunction
  ): WasmExpression {
    if (expr.type === "Integer") {
      return convertLiteralToConst(expr);
    } else if (expr.type === "FunctionCall") {
      const n: FunctionCall = expr;
      const args: WasmExpression[] = [];
      for (const arg of n.args) {
        args.push(evaluateExpression(arg, enclosingFunc));
      }
      return { type: "FunctionCall", name: n.name, args };
    } else if (expr.type === "VariableExpr") {
      const n: VariableExpr = expr;
      const wasmVariableName = getWasmVariableName(n.name, enclosingFunc);
      if (
        wasmVariableName in enclosingFunc.params ||
        wasmVariableName in enclosingFunc.locals
      ) {
        // the expression is a function parameter OR a local variable
        return {
          type: "LocalGet",
          name: wasmVariableName,
        };
      } else {
        return {
          type: "GlobalGet",
          name: wasmVariableName,
        };
      }
    } else if (
      expr.type === "ArithmeticExpression" ||
      expr.type === "ComparisonExpression"
    ) {
      return evaluateLeftToRightBinaryExpression(expr, enclosingFunc);
    } else if (expr.type === "PrefixExpression") {
      const n: PrefixExpression = expr;
      const wasmVariableName = getWasmVariableName(
        n.variable.name,
        enclosingFunc
      );
      let nodeGetTypeStr: "GlobalGet" | "LocalGet" = "GlobalGet";
      let nodeSetTypeStr: "GlobalSet" | "LocalSet" = "GlobalSet";
      if (
        wasmVariableName in enclosingFunc.params ||
        wasmVariableName in enclosingFunc.locals
      ) {
        nodeGetTypeStr = "LocalGet";
        nodeSetTypeStr = "LocalSet";
      }
      const wasmNode: WasmLocalGet | WasmGlobalGet = {
        type: nodeGetTypeStr,
        name: wasmVariableName,
        preStatements: [
          {
            type: nodeSetTypeStr,
            name: wasmVariableName,
            value: {
              type: "ArithmeticExpression",
              operator: unaryOperatorToBinaryOperator[n.operator],
              leftExpr: {
                type: nodeGetTypeStr,
                name: wasmVariableName,
              },
              rightExpr: {
                type: "Const",
                variableType: variableTypeToWasmType[n.variable.variableType],
                value: 1,
              },
              varType: variableTypeToWasmType[expr.variable.variableType],
            },
          } as WasmLocalSet | WasmGlobalSet,
        ],
      };
      return wasmNode;
    } else if (expr.type === "PostfixExpression") {
      const n: PostfixExpression = expr;
      const wasmVariableName = getWasmVariableName(
        n.variable.name,
        enclosingFunc
      );
      let nodeGetTypeStr: "GlobalGet" | "LocalGet" = "GlobalGet";
      let nodeSetTypeStr: "GlobalSet" | "LocalSet" = "GlobalSet";
      if (
        wasmVariableName in enclosingFunc.params ||
        wasmVariableName in enclosingFunc.locals
      ) {
        nodeGetTypeStr = "LocalGet";
        nodeSetTypeStr = "LocalSet";
      }
      const wasmNode: WasmLocalSet | WasmGlobalSet = {
        type: nodeSetTypeStr,
        name: wasmVariableName,
        value: {
          type: "ArithmeticExpression",
          operator: unaryOperatorToBinaryOperator[n.operator],
          leftExpr: {
            type: nodeGetTypeStr,
            name: wasmVariableName,
            preStatements: [
              {
                type: nodeGetTypeStr,
                name: wasmVariableName,
              },
            ],
          } as WasmLocalGet | WasmGlobalGet,
          rightExpr: {
            type: "Const",
            variableType: variableTypeToWasmType[n.variable.variableType],
            value: 1,
          },
          varType: variableTypeToWasmType[n.variable.variableType],
        },
      };
      return wasmNode;
    } else if (
      expr.type === "ConditionalExpression"
    ) {
      return evaluateConditionalExpression(expr, enclosingFunc);
    } else if (expr.type === "AssignmentExpression") {
      const n = expr as AssignmentExpression;
      const wasmVariableName = getWasmVariableName(
        n.variable.name,
        enclosingFunc
      );
      if (
        wasmVariableName in enclosingFunc.params ||
        wasmVariableName in enclosingFunc.locals
      ) {
        // parameter assignment or assignment to local scope variable
        return {
            type: "LocalTee",
            name: wasmVariableName,
            value: evaluateExpression(n.expr, enclosingFunc),
          }
      } else {
        // this assignment is to a global variable
        // no need do any checks, this would have been done in semantic analysis TODO: check this
        return {
            type: "GlobalTee",
            name: wasmVariableName,
            value: evaluateExpression(n.expr, enclosingFunc),
          }
      }
    }
    else {
      const ensureAllCasesHandled: never = expr; // simple compile time check that all cases are handled and expr is never
    }
  }

  for (const child of CAstRoot.children) {
    if (child.type === "FunctionDefinition") {
      const n = child as FunctionDefinition;
      const params: Record<string, WasmVariable> = {};
      for (const param of n.parameters) {
        const paramName = generateParamName(param.name);
        params[paramName] = {
          type: "FunctionParameter",
          name: paramName,
          variableType: variableTypeToWasmType[param.variableType],
        };
      }
      const f: WasmFunction = {
        type: "Function",
        name: n.name,
        params,
        locals: {},
        scopes: [new Set()],
        body: [],
        return:
          n.returnType === "void" || n.name === "main"
            ? null
            : variableTypeToWasmType[n.returnType],
      };
      for (const child of n.body.children) {
        visit(child, f);
      }
      wasmRoot.functions.push(f);
    } else if (child.type === "VariableDeclaration") {
      const n = child as VariableDeclaration;
      const globalVar: WasmGlobalVariable = {
        type: "GlobalVariable",
        name: n.name,
        variableType: variableTypeToWasmType[n.variableType],
      };
      wasmRoot.globals.push(globalVar);
    } else if (child.type === "Initialization") {
      const n = child as Initialization;
      const globalVar: WasmGlobalVariable = {
        type: "GlobalVariable",
        name: n.name,
        variableType: variableTypeToWasmType[n.variableType],
        initializerValue: convertLiteralToConst(n.value as Literal),
      };
      wasmRoot.globals.push(globalVar);
    }
  }

  return wasmRoot;
}
