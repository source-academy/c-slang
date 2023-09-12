/**
 * Exports a translate function that takes a C AST and produces a webassembly AST
 */

import { Root, Node, FunctionDefinition, VariableType, VariableDeclaration, Initialization, Literal, Block, ReturnStatement, VariableExpr, Expression, FunctionCall, Assignment } from "c-ast/c-nodes";
import { WasmConst, WasmExpression, WasmFunction, WasmGlobalVariable, WasmLocalVariable, WasmModule, WasmType } from "wasm-ast/wasm-nodes";

export function translate(CAstRoot: Root) {
  const wasmRoot: WasmModule = {
    type: "Module",
    globals: [],
    functions: []
  }

  /**
   * Converts a given variable name to a scoped variable name (meaning that scope information is included in the name itself).
   * This is to make up for wasm not having block scope. Thus we can have multiple vars of the same name (in C) in the same function
   * as long as they are in different blocks since their names in wat will be different.
   */
  function convertVarNameToScopedVarName(name: string, block: number) {
    return `${name}_${block.toString()}`;
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
      value: literal.value
    }
  }
  
  /**
   * Function for visting the statements within a function body.
   * For now, expressions execpt function calls are ignored since they are inconsequential. TODO: check this
   * @param CAstNode Node being visited.
   * @param enclosingFunc The enclosing function within which we are visiting lines.
   * @param enclosingBlockNum The block that this node is in. Everytime we enter a new block we increment by 1
   */
  function visit(CAstNode: Node, enclosingFunc: WasmFunction, enclosingBlockNum: number) {
    if (CAstNode.type === "Block") {
      const n = CAstNode as Block;
      for (const child of n.children) {
        visit(child, enclosingFunc, enclosingBlockNum + 1);
      }
    } else if (CAstNode.type === "ReturnStatement") {
      const n = CAstNode as ReturnStatement;
      enclosingFunc.body.push(evaluateExpression(n.value, enclosingBlockNum));
    }  else if (CAstNode.type === "Initialization") {
      const n = CAstNode as Initialization;
      const v: WasmLocalVariable = {type: "LocalVariable", name: convertVarNameToScopedVarName(n.name, enclosingBlockNum), variableType: convertVariableType(n.variableType)}
      enclosingFunc.locals.push(v);
      enclosingFunc.body.push({type: "LocalSet", name: n.name, value: evaluateExpression(n.value, enclosingBlockNum)})
    } else if (CAstNode.type === "VariableDeclaration") {
      const n = CAstNode as VariableDeclaration;
      enclosingFunc.locals.push({type: "LocalVariable", name: convertVarNameToScopedVarName(n.name, enclosingBlockNum), variableType: convertVariableType(n.variableType)});
    } else if (CAstNode.type === "Assignment") {
      const n = CAstNode as Assignment;
      if (convertVarNameToScopedVarName(n.name, enclosingBlockNum) in enclosingFunc.locals) {
        // this assignment is to a variable in local scope
        enclosingFunc.body.push({type: "LocalSet", name: convertVarNameToScopedVarName(n.name, enclosingBlockNum), value: evaluateExpression(n.value, enclosingBlockNum)})
      } else {
        // this assignment is to a global variable
        // no need do any checks, this would have been done in semantic analysis TODO: check this
        enclosingFunc.body.push({type: "GlobalSet", name: n.name, value: evaluateExpression(n.value, enclosingBlockNum)});
      }
    } else if (CAstNode.type === "FunctionCall") {
      const n = CAstNode as FunctionCall;
      const args: WasmExpression[] = [];
      for (const arg of n.args) {
        args.push(evaluateExpression(arg, enclosingBlockNum));
      }
      enclosingFunc.body.push({type: "FunctionCall", name: n.name, args});
    }
  }

  /**
   * Function that evaluates a given C expression and returns the corresponding WASM expression.
   */
  function evaluateExpression(expr: Expression, enclosingBlockNum: number): WasmExpression {
    if (expr.type === "Integer") {
      return convertLiteralToConst(expr);
    } else if (expr.type === "FunctionCall") {
      const n: FunctionCall = expr;
      const args: WasmExpression[] = [];
      for (const arg of n.args) {
        args.push(evaluateExpression(arg, enclosingBlockNum));
      }
      return {type: "FunctionCall", name: n.name, args};
    } else if (expr.type === "VariableExpr") {
      const n: VariableExpr = expr;
      return {type: "LocalGet", name: convertVarNameToScopedVarName(n.name, enclosingBlockNum)};
    }
  }



  for (const child of CAstRoot.children) {
    if (child.type ===  "FunctionDefinition") {
      const node = child as FunctionDefinition;
      const f: WasmFunction = {
        type: "Function",
        name: node.name,
        params: node.parameters.map(param => ({type: "FunctionParameter", name: param.name, variableType: convertVariableType(param.variableType)})),
        locals: [],
        body: [],
        return: convertVariableType(node.returnType)
      }
      visit(node.body, f, 0);
      wasmRoot.functions.push(f);
    } else if (child.type === "VariableDeclaration") {
      const n = child as VariableDeclaration;
      const globalVar: WasmGlobalVariable = {
        type: "GlobalVariable",
        name: n.name,
        variableType: convertVariableType(n.variableType),
      }
      wasmRoot.globals.push(globalVar);
    } else if (child.type === "Initialization") {
      const n = child as Initialization;
      const globalVar: WasmGlobalVariable = {
        type: "GlobalVariable",
        name: n.name,
        variableType: convertVariableType(n.variableType),
        initializerValue: convertLiteralToConst(n.value as Literal)
      }
      wasmRoot.globals.push(globalVar);
    }
  }

  return wasmRoot;
}