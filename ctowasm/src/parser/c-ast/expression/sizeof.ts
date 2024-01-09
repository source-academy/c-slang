/**
 * Any other C AST nodes are defined here.
 */

import { CNodeBase, Expression } from "~src/parser/c-ast/core";

export default interface SizeOfExpression extends CNodeBase {
  type: "SizeOfExpression",
  expr: Expression // the expression whose size is being retrieved
}