import { TypedExpression, isPrimaryExprString } from "../ast/types";
import {
  getNumericalLimitFromSpecifiers,
  typeInfoToSpecifier,
} from "./specifiers";
import {
  Int,
  IntegerType,
  Type,
  unsignedInt,
  int,
  isArray,
  isFunction,
  isSigned,
  pointer,
  unsignedChar,
  unsignedShortInt,
  unsignedLongInt,
  unsignedLongLongInt,
  UnsignedInt,
} from "./types";

export const INTEGRAL_TYPE_TO_CONVERSION_RANK: Record<
  IntegerType["type"],
  number
> = {
  [Type._Bool]: 0,

  [Type.Char]: 1,
  [Type.SignedChar]: 1,
  [Type.UnsignedChar]: 1,

  [Type.ShortInt]: 2,
  [Type.UnsignedShortInt]: 2,

  [Type.Int]: 3,
  [Type.UnsignedInt]: 3,

  [Type.LongInt]: 4,
  [Type.UnsignedLongInt]: 4,

  [Type.LongLongInt]: 5,
  [Type.UnsignedLongLongInt]: 5,
};

export const UNSIGNED_COUNTERPART: Record<IntegerType["type"], IntegerType> = {
  [Type._Bool]: unsignedChar(),

  [Type.Char]: unsignedChar(),
  [Type.SignedChar]: unsignedChar(),
  [Type.UnsignedChar]: unsignedChar(),

  [Type.ShortInt]: unsignedShortInt(),
  [Type.UnsignedShortInt]: unsignedShortInt(),

  [Type.Int]: unsignedInt(),
  [Type.UnsignedInt]: unsignedInt(),

  [Type.LongInt]: unsignedLongInt(),
  [Type.UnsignedLongInt]: unsignedLongInt(),

  [Type.LongLongInt]: unsignedLongLongInt(),
  [Type.UnsignedLongLongInt]: unsignedLongLongInt(),
};

export const rankOf = (t: IntegerType): number =>
  INTEGRAL_TYPE_TO_CONVERSION_RANK[t.type];

// https://en.cppreference.com/w/c/language/conversion
export const applyIntegerPromotions = <T extends IntegerType>(
  t: T,
): Int | UnsignedInt | T => {
  if (rankOf(t) > rankOf(int())) return t;
  if (aCanRepresentB(int(), t)) return int();
  return unsignedInt();
};

export const applyUsualArithmeticConversions = (
  t: IntegerType,
  u: IntegerType,
): IntegerType => {
  t = applyIntegerPromotions(t);
  u = applyIntegerPromotions(u);
  if (t.type === u.type) return t;
  if (isSigned(t) === isSigned(u)) return rankOf(t) < rankOf(u) ? u : t;
  if (isSigned(u)) [u, t] = [t, u];
  if (rankOf(u) >= rankOf(t)) return u;
  if (aCanRepresentB(t, u)) return t;
  return UNSIGNED_COUNTERPART[t.type];
};

const aCanRepresentB = (a: IntegerType, b: IntegerType): boolean => {
  const [a_min, a_max] = getNumericalLimitFromSpecifiers(
    typeInfoToSpecifier(a),
  );
  const [b_min, b_max] = getNumericalLimitFromSpecifiers(
    typeInfoToSpecifier(b),
  );
  return a_min <= b_min && b_max <= a_max;
};

// TODO: see 6.3.2.1 for implicit conversions of array/functions/lvalues and cppref on "implicit conversions"
export const applyImplicitConversions = (
  t: TypedExpression,
): TypedExpression => {
  const t0 = t.typeInfo;
  if (isArray(t0) && !isPrimaryExprString(t)) {
    return { ...t, typeInfo: pointer(t0.elementType), lvalue: false };
  }
  if (isFunction(t0)) {
    return { ...t, typeInfo: pointer(t0) };
  }
  return t;
};
