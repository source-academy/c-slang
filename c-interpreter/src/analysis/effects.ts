import { TypedExpression, TypedPostfixOp } from "../ast/types";
import { isFunction } from "../typing/types";

// Syntactic, cached per node: decides whether an operand group is worth
// recording at all (B4.5). Over-approximating only costs time, never notes.
const effectsCache = new WeakMap<object, boolean>();
const accessCache = new WeakMap<object, boolean>();

const memo = (
  cache: WeakMap<object, boolean>,
  key: object,
  compute: () => boolean,
): boolean => {
  const hit = cache.get(key);
  if (hit !== undefined) return hit;
  const value = compute();
  cache.set(key, value);
  return value;
};

const opOperands = (op: TypedPostfixOp): TypedExpression[] => {
  switch (op.type) {
    case "ArraySubscripting":
      return [op.value];
    case "FunctionCall":
      return op.value;
    default:
      return [];
  }
};

// Whether evaluating `e` may write an object or print. Any call counts.
export const mayHaveSideEffects = (e: TypedExpression): boolean =>
  memo(effectsCache, e, () => {
    switch (e.type) {
      case "AssignmentExpression":
      case "UnaryExpressionIncr":
      case "UnaryExpressionDecr":
        return true;
      case "PostfixExpression":
        return (
          e.op.type === "PostfixIncrement" ||
          e.op.type === "PostfixDecrement" ||
          e.op.type === "FunctionCall" ||
          mayHaveSideEffects(e.expr) ||
          opOperands(e.op).some(mayHaveSideEffects)
        );
      case "BinaryExpr":
        return mayHaveSideEffects(e.left) || mayHaveSideEffects(e.right);
      case "ConditionalExpression":
        return [e.cond, e.exprIfTrue, e.exprIfFalse].some(mayHaveSideEffects);
      case "CommaOperator":
        return e.value.some(mayHaveSideEffects);
      case "CastExpression":
        return mayHaveSideEffects(e.expr);
      case "UnaryExpression":
        return mayHaveSideEffects(e.expr);
      case "PrimaryExprParenthesis":
        return mayHaveSideEffects(e.value);
      default:
        return false;
    }
  });

// What an address computation itself reads: `x` touches nothing, `a[i]`
// reads i, `*p` reads p.
const designationAccess = (e: TypedExpression): boolean => {
  switch (e.type) {
    case "PrimaryExprIdentifier":
      return false;
    case "PrimaryExprParenthesis":
      return designationAccess(e.value);
    case "PostfixExpression":
      return e.op.type === "StructMember" ? designationAccess(e.expr) : mayAccessMemory(e);
    case "UnaryExpression":
      return e.op === "*" ? mayAccessMemory(e.expr) : mayAccessMemory(e);
    default:
      return mayAccessMemory(e);
  }
};

// Whether evaluating `e` may read or write an object. String literals are
// read-only, so reading one can't conflict with anything.
export const mayAccessMemory = (e: TypedExpression, asDesignation = false): boolean => {
  if (asDesignation) return designationAccess(e);
  return memo(accessCache, e, () => {
    switch (e.type) {
      case "PrimaryExprIdentifier":
        return !isFunction(e.typeInfo);
      case "AssignmentExpression":
      case "UnaryExpressionIncr":
      case "UnaryExpressionDecr":
      case "PostfixExpression":
        return true;
      case "UnaryExpression":
        return e.op === "&" ? designationAccess(e.expr) : mayAccessMemory(e.expr);
      case "BinaryExpr":
        return mayAccessMemory(e.left) || mayAccessMemory(e.right);
      case "ConditionalExpression":
        return [e.cond, e.exprIfTrue, e.exprIfFalse].some((x) => mayAccessMemory(x));
      case "CommaOperator":
        return e.value.some((x) => mayAccessMemory(x));
      case "CastExpression":
        return mayAccessMemory(e.expr);
      case "PrimaryExprParenthesis":
        return mayAccessMemory(e.value);
      default:
        return false;
    }
  });
};
