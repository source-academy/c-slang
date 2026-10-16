import { TypedExpression, TypedIntegerConstant } from "../ast/types";
import {
  applyIntegerPromotions,
  applyIntegerUsualArithmeticConversions,
} from "./conversions";
import { TypeCheckingError } from "./errors";
import {
  BIGINT_TO_BYTES,
  TRUNCATE_TO_TYPE,
  bytesToBigint,
} from "./representation";
import { IntegerType, int, isIntegerType, isSigned } from "./types";

interface IntegerValue {
  value: bigint;
  typeInfo: IntegerType;
}

const invalid = (t: TypedExpression): never => {
  throw new TypeCheckingError(
    t,
    "unsupported operand or operator in integer constant expression",
  );
};

// Validate both branches, but evaluate only the branch selected by C semantics.
const validate = (t: TypedExpression): void => {
  if (!isIntegerType(t.typeInfo)) invalid(t);
  switch (t.type) {
    case "PrimaryExprConstant":
    case "UnaryExpressionSizeof":
      return;
    case "PrimaryExprParenthesis":
      return validate(t.value);
    case "CastExpression":
      return validate(t.expr);
    case "UnaryExpression":
      if (!["+", "-", "~", "!"].includes(t.op)) invalid(t);
      return validate(t.expr);
    case "BinaryExpr":
      validate(t.left);
      return validate(t.right);
    case "ConditionalExpression":
      validate(t.cond);
      validate(t.exprIfTrue);
      return validate(t.exprIfFalse);
    default:
      invalid(t);
  }
};

const encode = (
  value: bigint,
  typeInfo: IntegerType,
  conversion = false,
): IntegerValue => ({
  value: bytesToBigint(
    (conversion ? TRUNCATE_TO_TYPE : BIGINT_TO_BYTES)[typeInfo.type](
      value,
      "little",
    ),
    isSigned(typeInfo),
    "little",
  ),
  typeInfo,
});

const truth = (value: boolean): IntegerValue =>
  encode(BigInt(value ? 1 : 0), int());

const evaluate = (t: TypedExpression): IntegerValue => {
  if (!isIntegerType(t.typeInfo)) return invalid(t);
  switch (t.type) {
    case "PrimaryExprConstant":
      return encode(
        typeof t.value === "string"
          ? BigInt(t.value.charCodeAt(0))
          : BigInt(t.value.value),
        t.typeInfo,
      );
    case "UnaryExpressionSizeof":
      return encode(BigInt(t.value), t.typeInfo);
    case "PrimaryExprParenthesis":
      return evaluate(t.value);
    case "CastExpression":
      return encode(evaluate(t.expr).value, t.typeInfo, true);
    case "UnaryExpression": {
      const operand = evaluate(t.expr);
      const type = applyIntegerPromotions(operand.typeInfo);
      switch (t.op) {
        case "+":
          return encode(operand.value, type);
        case "-":
          return encode(-operand.value, type);
        case "~":
          return encode(~operand.value, type);
        case "!":
          return truth(operand.value === BigInt(0));
        default:
          return invalid(t);
      }
    }
    case "ConditionalExpression": {
      const a = t.exprIfTrue.typeInfo;
      const b = t.exprIfFalse.typeInfo;
      if (!isIntegerType(a) || !isIntegerType(b)) return invalid(t);
      const type = applyIntegerUsualArithmeticConversions(a, b);
      const branch =
        evaluate(t.cond).value !== BigInt(0) ? t.exprIfTrue : t.exprIfFalse;
      return encode(evaluate(branch).value, type, true);
    }
    case "BinaryExpr": {
      const left = evaluate(t.left);
      if (t.op === "&&")
        return truth(
          left.value !== BigInt(0) && evaluate(t.right).value !== BigInt(0),
        );
      if (t.op === "||")
        return truth(
          left.value !== BigInt(0) || evaluate(t.right).value !== BigInt(0),
        );
      const right = evaluate(t.right);
      if (t.op === "<<" || t.op === ">>") {
        const type = applyIntegerPromotions(left.typeInfo);
        const l = encode(left.value, type, true).value;
        const r = right.value;
        if (r < BigInt(0) || r >= BigInt(type.size * 8))
          throw new Error(
            "undefined behaviour: shift count outside promoted operand width",
          );
        if (t.op === "<<" && isSigned(type) && l < BigInt(0))
          throw new Error(
            "undefined behaviour: left shift of negative signed value",
          );
        return encode(t.op === "<<" ? l << r : l >> r, type);
      }
      const type = applyIntegerUsualArithmeticConversions(
        left.typeInfo,
        right.typeInfo,
      );
      const l = encode(left.value, type, true).value;
      const r = encode(right.value, type, true).value;
      let value: bigint;
      switch (t.op) {
        case "+":
          value = l + r;
          break;
        case "-":
          value = l - r;
          break;
        case "*":
          value = l * r;
          break;
        case "/":
        case "%":
          if (r === BigInt(0))
            throw new Error("undefined behaviour: division by zero");
          // The quotient must fit even when only the remainder is requested.
          encode(l / r, type);
          value = t.op === "/" ? l / r : l % r;
          break;
        case "&":
          value = l & r;
          break;
        case "|":
          value = l | r;
          break;
        case "^":
          value = l ^ r;
          break;
        case "==":
          return truth(l === r);
        case "!=":
          return truth(l !== r);
        case "<":
          return truth(l < r);
        case ">":
          return truth(l > r);
        case "<=":
          return truth(l <= r);
        case ">=":
          return truth(l >= r);
      }
      return encode(value, type);
    }
    default:
      return invalid(t);
  }
};

export const evaluateIntegerConstantExpression = (
  t: TypedExpression,
): TypedIntegerConstant => {
  validate(t);
  return { ...t, ...evaluate(t), type: "IntegerConstant", lvalue: false };
};
