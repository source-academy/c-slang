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
} from "c-ast/c-nodes";
import {
  WasmConst,
  WasmExpression,
  WasmFunction,
  WasmGlobalVariable,
  WasmLocalVariable,
  WasmModule,
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

  // convert variable type from C variable to
  function convertVariableType(type: VariableType): WasmType {
    //TODO: add more type support
    if (type === "int") {
      return "i32";
    }
  }

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
   * Function for visting the statements within a function body.
   * For now, expressions execpt function calls are ignored since they are inconsequential. TODO: check this
   * @param CAstNode Node being visited.
   * @param enclosingFunc The enclosing function within which we are visiting lines.
   * @param enclosingBlockNum The block that this node is in. Everytime we enter a new block we increment by 1
   */
  function visit(
    CAstNode: Node,
    enclosingFunc: WasmFunction
  ) {
    if (CAstNode.type === "Block") {
      const n = CAstNode as Block;
      enclosingFunc.scopes.push(new Set()); // push on new scope for this block
      for (const child of n.children) {
        visit(child, enclosingFunc);
      }
      enclosingFunc.scopes.pop(); // pop off the scope for this block
    } else if (CAstNode.type === "ReturnStatement") {
      const n = CAstNode as ReturnStatement;
      if (enclosingFunc.name !== "main") {
        // main shouldnt have any return for wasm
        enclosingFunc.body.push(evaluateExpression(n.value, enclosingFunc));
      }
    } else if (CAstNode.type === "Initialization") {
      const n = CAstNode as Initialization;
      enclosingFunc.scopes[enclosingFunc.scopes.length - 1].add(n.name);
      const v: WasmLocalVariable = {
        type: "LocalVariable",
        name: convertVarNameToScopedVarName(n.name, enclosingFunc.scopes.length - 1),
        variableType: convertVariableType(n.variableType),
      };
      enclosingFunc.locals[v.name] = v;
      enclosingFunc.body.push({
        type: "LocalSet",
        name: convertVarNameToScopedVarName(n.name, enclosingFunc.scopes.length - 1),
        value: evaluateExpression(n.value, enclosingFunc),
      });
    } else if (CAstNode.type === "VariableDeclaration") {
      const n = CAstNode as VariableDeclaration;
      enclosingFunc.scopes[enclosingFunc.scopes.length - 1].add(n.name);
      const localVar = {
        type: "LocalVariable",
        name: convertVarNameToScopedVarName(n.name, enclosingFunc.scopes.length - 1),
        variableType: convertVariableType(n.variableType),
      };
      enclosingFunc.locals[localVar.name] = localVar;
    } else if (CAstNode.type === "Assignment") {
      const n = CAstNode as Assignment;
      const wasmVariableName = getWasmVariableName(n.name, enclosingFunc);
      if (wasmVariableName in enclosingFunc.params) {
        // parameter assignment
        enclosingFunc.body.push({
          type: "LocalSet",
          name: wasmVariableName,
          value: evaluateExpression(n.value, enclosingFunc),
        });
      } else if (wasmVariableName in enclosingFunc.locals) {
        // this assignment is to a variable in local scope
        enclosingFunc.body.push({
          type: "LocalSet",
          name: wasmVariableName,
          value: evaluateExpression(n.value, enclosingFunc),
        });
      } else {
        // this assignment is to a global variable
        // no need do any checks, this would have been done in semantic analysis TODO: check this
        enclosingFunc.body.push({
          type: "GlobalSet",
          name: wasmVariableName,
          value: evaluateExpression(n.value, enclosingFunc),
        });
      }
    } else if (CAstNode.type === "FunctionCall") {
      const n = CAstNode as FunctionCall;
      const args: WasmExpression[] = [];
      for (const arg of n.args) {
        args.push(evaluateExpression(arg, enclosingFunc));
      }
      enclosingFunc.body.push({ type: "FunctionCall", name: n.name, args });
    }
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
      if (wasmVariableName in enclosingFunc.params || wasmVariableName in enclosingFunc.locals) {
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
    } else {
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
          variableType: convertVariableType(param.variableType),
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
            : convertVariableType(n.returnType),
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
        variableType: convertVariableType(n.variableType),
      };
      wasmRoot.globals.push(globalVar);
    } else if (child.type === "Initialization") {
      const n = child as Initialization;
      const globalVar: WasmGlobalVariable = {
        type: "GlobalVariable",
        name: n.name,
        variableType: convertVariableType(n.variableType),
        initializerValue: convertLiteralToConst(n.value as Literal),
      };
      wasmRoot.globals.push(globalVar);
    }
  }

  return wasmRoot;
}
