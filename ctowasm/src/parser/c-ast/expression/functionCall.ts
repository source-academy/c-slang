/**
 * Contains the defintions for all function related nodes.
 */
import { Expression } from "~src/parser/c-ast/core";
import { UnaryExpressionBase } from "./unaryExpression";
import IdentifierExpr from "~src/parser/c-ast/expression/identifierExpr";

export default interface FunctionCall extends UnaryExpressionBase {
  type: "FunctionCall";
  expr: Expression;
  args: IdentifierExpr[];
}