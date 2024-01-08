/**
 * Contains the defintions for all function related nodes.
 */
import { CNodeBase, Block, Expression, CNode } from "~src/parser/c-ast/core";
import { VariableExpr } from "~src/parser/c-ast/variable";
import { FunctionDataType } from "~src/parser/c-ast/dataTypes";
import { UnaryExpressionBase } from "./unaryExpression";


export interface FunctionDefinition extends CNodeBase {
  type: "FunctionDefinition";
  name: string;
  dataType: FunctionDataType; // contains returntype and parameter type details
  body: Block;
  parameterNames: string[]; // the names of the parameters of the function following the same order as parameter types inside functionType
}

type Callable = VariableExpr; // the nodes that can be called

const callables = new Set(["VariableExpr"]);

/**
 * Helper function to check if a given node type is callable
 */
export function isCallableNode(node: CNode) {
  return node.type in callables;
}

export interface FunctionCall extends UnaryExpressionBase {
  type: "FunctionCall";
  expr: Callable;
  args: VariableExpr[];
}

/**
 * This node is to differentiate from a function call used as an expression.
 */
export interface FunctionCallStatement extends UnaryExpressionBase {
  type: "FunctionCallStatement";
  expr: Callable;
  args: Expression[];
}
