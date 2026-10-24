import { Endianness } from "../config";
import { BIGINT_TO_BYTES, bytesToBigint, convertArithmeticBytes } from "../typing/representation";
import { ObjectTypeInfo, Type, isArithmeticType, isFloatingType, isScalarType, isSigned } from "../typing/types";
import { TemporaryObject } from "./object";

// Constraints are checked by the type checker before evaluation.
export const convertForAssignment = (
  object: TemporaryObject,
  target: ObjectTypeInfo,
  endianness: Endianness,
): TemporaryObject => {
  if (target.type === Type._Any) return object;
  const source = object.typeInfo;
  if (isArithmeticType(source) && isArithmeticType(target))
    return new TemporaryObject(target, convertArithmeticBytes(object.bytes, source, target, endianness));
  if (isScalarType(source) && isScalarType(target)) {
    if (isFloatingType(source) || isFloatingType(target))
      throw new Error("unexpected scalar conversion");
    const value = bytesToBigint(object.bytes, isSigned(source), endianness);
    return new TemporaryObject(target, BIGINT_TO_BYTES[target.type](value, endianness));
  }
  return new TemporaryObject(target, object.bytes);
};
