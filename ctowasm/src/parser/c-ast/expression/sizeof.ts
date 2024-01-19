/**
 * Any other C AST nodes are defined here.
 */

import { CNodeBase, Expression } from "~src/parser/c-ast/core";
import { DataType } from "~src/parser/c-ast/dataTypes";

type SizeOfExpression = SizeOfExpressionExpression | SizeOfDataTypeExpression;
export default SizeOfExpression;

interface SizeOfExpressionBase extends CNodeBase {
  type: "SizeOfExpression";
  subtype: "expression" | "dataType" // whether this sizeof is of a data type or an expression
}

interface SizeOfExpressionExpression extends SizeOfExpressionBase {
  subtype: "expression";
  expr: Expression;
}

interface SizeOfDataTypeExpression extends SizeOfExpressionBase {
  subtype: "dataType";
  dataType: DataType;
}