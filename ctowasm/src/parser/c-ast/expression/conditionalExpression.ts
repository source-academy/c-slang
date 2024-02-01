import { CNodeBase, Expression } from "~src/parser/c-ast/core";

export default interface ConditionalExpression extends CNodeBase {
  type: "ConditionalExpression";
  condition: Expression;
  trueExpression: Expression;
  falseExpression: Expression;
}
