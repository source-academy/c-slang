import { Identifier } from "../ast/types";
import { roundUpM } from "../utils";
import {
  CHAR_ALIGN,
  CHAR_SIZE,
  DBL_ALIGN,
  DBL_SIZE,
  FLT_ALIGN,
  FLT_SIZE,
  INT_ALIGN,
  INT_SIZE,
  LLONG_ALIGN,
  LLONG_SIZE,
  LONG_ALIGN,
  LONG_SIZE,
  SCHAR_ALIGN,
  SCHAR_SIZE,
  SHRT_ALIGN,
  SHRT_SIZE,
  UCHAR_ALIGN,
  UCHAR_SIZE,
  UINT_ALIGN,
  UINT_SIZE,
  ULLONG_ALIGN,
  ULLONG_SIZE,
  ULONG_ALIGN,
  ULONG_SIZE,
  USHRT_ALIGN,
  USHRT_SIZE,
} from "./../constants";

export enum Type {
  _Bool = "bool",
  Char = "char",
  SignedChar = "signed char",
  UnsignedChar = "unsigned char",
  ShortInt = "short",
  UnsignedShortInt = "unsigned short",
  Int = "int",
  UnsignedInt = "unsigned",
  LongInt = "long",
  UnsignedLongInt = "unsigned long",
  LongLongInt = "long long",
  UnsignedLongLongInt = "unsigned long long",
  Float = "float",
  Double = "double",

  Void = "void",

  Array = "arr",
  Structure = "struct",
  Function = "fn",
  Pointer = "ptr",

  _Any = "any object", // hack for inbuilt print function
}

export const getTypeName = (i: TypeInfo): string => {
  if (isArray(i)) return i.type + " of " + getTypeName(i.elementType);
  if (isFunction(i)) return i.type + " returning " + getTypeName(i.returnType);
  if (isPointer(i)) return i.type + " to " + getTypeName(i.referencedType);
  if (isStructure(i))
    return (i.isUnion ? "union" : "struct") + (i.tag ? " " + i.tag : "");
  return i.type;
};

// types are partitioned into object types (fully describes object),
// function types (describes function), and incomplete types (lack info to determine sizes)

export type ObjectType =
  | Type._Bool
  | Type.Char
  | Type.SignedChar
  | Type.UnsignedChar
  | Type.ShortInt
  | Type.UnsignedShortInt
  | Type.Int
  | Type.UnsignedInt
  | Type.LongInt
  | Type.UnsignedLongInt
  | Type.LongLongInt
  | Type.UnsignedLongLongInt
  | Type.Float
  | Type.Double
  | Type.Array
  | Type.Structure
  | Type.Pointer
  | Type._Any;

export type IncompleteType = Type.Void | Type.Array;

export type SignedIntegerType =
  | SignedChar
  | ShortInt
  | Int
  | LongInt
  | LongLongInt;

export const isSignedIntegerType = (t: TypeInfo): t is SignedIntegerType =>
  isSignedChar(t) ||
  isShortInt(t) ||
  isInt(t) ||
  isLongInt(t) ||
  isLongLongInt(t);

export const getUnsignedVersion = (
  t: SignedIntegerType,
): UnsignedIntegerType => {
  if (isSignedChar(t)) return unsignedChar();
  if (isShortInt(t)) return unsignedShortInt();
  if (isInt(t)) return unsignedInt();
  if (isLongInt(t)) return unsignedLongInt();
  if (isLongLongInt(t)) return unsignedLongLongInt();
  throw new Error("unrecognized signed integer type");
};

export type UnsignedIntegerType =
  | _Bool
  | UnsignedChar
  | UnsignedShortInt
  | UnsignedInt
  | UnsignedLongInt
  | UnsignedLongLongInt;

export const isUnsignedIntegerType = (t: TypeInfo): t is UnsignedIntegerType =>
  isBool(t) ||
  isUnsignedChar(t) ||
  isUnsignedShortInt(t) ||
  isUnsignedInt(t) ||
  isUnsignedLongInt(t) ||
  isUnsignedLongLongInt(t);

export const getSignedVersion = (t: UnsignedIntegerType): SignedIntegerType => {
  if (isUnsignedChar(t)) return signedChar();
  if (isUnsignedShortInt(t)) return shortInt();
  if (isUnsignedInt(t)) return int();
  if (isUnsignedLongInt(t)) return longInt();
  if (isUnsignedLongLongInt(t)) return longLongInt();
  throw new Error("unrecognized unsigned integer type");
};

export type BasicType = IntegerType | FloatingType;

export type CharacterType = Char | SignedChar | UnsignedChar;

export const isCharacterType = (t: TypeInfo): t is CharacterType =>
  isChar(t) || isSignedChar(t) || isUnsignedChar(t);

export type IntegerType = Char | SignedIntegerType | UnsignedIntegerType;

export const isIntegerType = (t: TypeInfo): t is IntegerType =>
  isChar(t) || isSignedIntegerType(t) || isUnsignedIntegerType(t);

export type FloatingType = FloatType | DoubleType;

export const isFloatingType = (t: TypeInfo): t is FloatingType =>
  isFloatType(t) || isDoubleType(t);

export type ArithmeticType = IntegerType | FloatingType;

export const isArithmeticType = (t: TypeInfo): t is ArithmeticType =>
  isIntegerType(t) || isFloatingType(t);

export type ScalarType = ArithmeticType | Pointer;

export const isScalarType = (t: TypeInfo): t is ScalarType =>
  isArithmeticType(t) || isPointer(t);

export const isSigned = (t: ScalarType): boolean =>
  isChar(t) || isSignedIntegerType(t);

export type AggregateType = Array | Structure;

export const isAggregateType = (t: TypeInfo): t is AggregateType =>
  (isArray(t) && t.length !== null) || isStructure(t);

export type DerviedDeclaratorType =
  | Array
  | IncompleteArray
  | FunctionType
  | Pointer;

// maximum recursion depth for isCompatible checks to deal with cyclic types
export const COMPATIBLE_CHECK_MAX_DEPTH = 32;

export interface BaseTypeInfo {
  type: Type;
  const?: boolean;
  isCompatible: (other: TypeInfo, depth?: number) => boolean;
}

export type TypeInfo = ObjectTypeInfo | IncompleteTypeInfo | FunctionTypeInfo;

const sameQualifiers = (a: BaseTypeInfo, b: BaseTypeInfo): boolean =>
  !!a.const === !!b.const;

export const unqualified = <T extends TypeInfo>(t: T): T =>
  t.const ? { ...t, const: false } : t;

export const constQualified = <T extends TypeInfo>(t: T): T => {
  if (isFunction(t)) throw "cannot qualify function type";
  // In C11, qualifying an array qualifies its element type.
  if (isArray(t)) return array(constQualified(t.elementType), t.length) as T;
  return { ...t, const: true };
};

export const containsConst = (t: TypeInfo): boolean => {
  if (t.const) return true;
  if (isArray(t)) return containsConst(t.elementType);
  if (isStructure(t)) return t.members.some((m) => containsConst(m.type));
  return false;
};

export interface ObjectTypeInfo extends BaseTypeInfo {
  type: ObjectType;
  size: number; // in bytes
  alignment: number; // should be a power of 2
}

export const isObjectTypeInfo = (i: BaseTypeInfo): i is ObjectTypeInfo =>
  !isIncompleteTypeInfo(i) && !isFunctionTypeInfo(i);

export interface _Any extends BaseTypeInfo {
  type: Type._Any;
  size: -1;
  alignment: -1;
}

export const _any = (): _Any => ({
  type: Type._Any,
  size: -1,
  alignment: -1,
  isCompatible: () => false,
});

export interface _Bool extends ObjectTypeInfo {
  type: Type._Bool;
  size: typeof CHAR_SIZE;
  alignment: typeof CHAR_ALIGN;
}

export const _bool = (): _Bool => ({
  type: Type._Bool,
  size: CHAR_SIZE,
  alignment: CHAR_ALIGN,
  isCompatible(other: TypeInfo) {
    return sameQualifiers(this, other) && isBool(other);
  },
});

export const isBool = (t: TypeInfo): t is _Bool => t.type === Type._Bool;

export interface Char extends ObjectTypeInfo {
  type: Type.Char;
  size: typeof CHAR_SIZE;
  alignment: typeof CHAR_ALIGN;
}

export const char = (): Char => ({
  type: Type.Char,
  size: CHAR_SIZE,
  alignment: CHAR_ALIGN,
  isCompatible(other: TypeInfo) {
    return sameQualifiers(this, other) && isChar(other);
  },
});

export const isChar = (t: TypeInfo): t is Char => t.type === Type.Char;

export interface SignedChar extends ObjectTypeInfo {
  type: Type.SignedChar;
  size: typeof SCHAR_SIZE;
  alignment: typeof SCHAR_ALIGN;
}

export const signedChar = (): SignedChar => ({
  type: Type.SignedChar,
  size: SCHAR_SIZE,
  alignment: SCHAR_ALIGN,
  isCompatible(other: TypeInfo) {
    return sameQualifiers(this, other) && isSignedChar(other);
  },
});

export const isSignedChar = (t: TypeInfo): t is SignedChar =>
  t.type === Type.SignedChar;

export interface UnsignedChar extends ObjectTypeInfo {
  type: Type.UnsignedChar;
  size: typeof UCHAR_SIZE;
  alignment: typeof UCHAR_ALIGN;
}

export const unsignedChar = (): UnsignedChar => ({
  type: Type.UnsignedChar,
  size: UCHAR_SIZE,
  alignment: UCHAR_ALIGN,
  isCompatible(other: TypeInfo) {
    return sameQualifiers(this, other) && isUnsignedChar(other);
  },
});

export const isUnsignedChar = (t: TypeInfo): t is UnsignedChar =>
  t.type === Type.UnsignedChar;

export interface ShortInt extends ObjectTypeInfo {
  type: Type.ShortInt;
  size: typeof SHRT_SIZE;
  alignment: typeof SHRT_ALIGN;
}

export const shortInt = (): ShortInt => ({
  type: Type.ShortInt,
  size: SHRT_SIZE,
  alignment: SHRT_ALIGN,
  isCompatible(other: TypeInfo) {
    return sameQualifiers(this, other) && isShortInt(other);
  },
});

export const isShortInt = (t: TypeInfo): t is ShortInt =>
  t.type === Type.ShortInt;

export interface UnsignedShortInt extends ObjectTypeInfo {
  type: Type.UnsignedShortInt;
  size: typeof USHRT_SIZE;
  alignment: typeof USHRT_ALIGN;
}

export const unsignedShortInt = (): UnsignedShortInt => ({
  type: Type.UnsignedShortInt,
  size: USHRT_SIZE,
  alignment: USHRT_ALIGN,
  isCompatible(other: TypeInfo) {
    return sameQualifiers(this, other) && isUnsignedShortInt(other);
  },
});

export const isUnsignedShortInt = (t: TypeInfo): t is UnsignedShortInt =>
  t.type === Type.UnsignedShortInt;

export interface Int extends ObjectTypeInfo {
  type: Type.Int;
  size: typeof INT_SIZE;
  alignment: typeof INT_ALIGN;
}

export const int = (): Int => ({
  type: Type.Int,
  size: INT_SIZE,
  alignment: INT_ALIGN,
  isCompatible(other: TypeInfo) {
    return sameQualifiers(this, other) && isInt(other);
  },
});

export const isInt = (t: TypeInfo): t is Int => t.type === Type.Int;

export interface UnsignedInt extends ObjectTypeInfo {
  type: Type.UnsignedInt;
  size: typeof UINT_SIZE;
  alignment: typeof UINT_ALIGN;
}

export const unsignedInt = (): UnsignedInt => ({
  type: Type.UnsignedInt,
  size: UINT_SIZE,
  alignment: UINT_ALIGN,
  isCompatible(other: TypeInfo) {
    return sameQualifiers(this, other) && isUnsignedInt(other);
  },
});

export const isUnsignedInt = (t: TypeInfo): t is UnsignedInt =>
  t.type === Type.UnsignedInt;

export interface LongInt extends ObjectTypeInfo {
  type: Type.LongInt;
  size: typeof LONG_SIZE;
  alignment: typeof LONG_ALIGN;
}

export const longInt = (): LongInt => ({
  type: Type.LongInt,
  size: LONG_SIZE,
  alignment: LONG_ALIGN,
  isCompatible(other: TypeInfo) {
    return sameQualifiers(this, other) && isLongInt(other);
  },
});

export const isLongInt = (t: TypeInfo): t is LongInt => t.type === Type.LongInt;

export interface UnsignedLongInt extends ObjectTypeInfo {
  type: Type.UnsignedLongInt;
  size: typeof ULONG_SIZE;
  alignment: typeof ULONG_ALIGN;
}

export const unsignedLongInt = (): UnsignedLongInt => ({
  type: Type.UnsignedLongInt,
  size: ULONG_SIZE,
  alignment: ULONG_ALIGN,
  isCompatible(other: TypeInfo) {
    return sameQualifiers(this, other) && isUnsignedLongInt(other);
  },
});

export const isUnsignedLongInt = (t: TypeInfo): t is UnsignedLongInt =>
  t.type === Type.UnsignedLongInt;

export interface LongLongInt extends ObjectTypeInfo {
  type: Type.LongLongInt;
  size: typeof LLONG_SIZE;
  alignment: typeof LLONG_ALIGN;
}

export const longLongInt = (): LongLongInt => ({
  type: Type.LongLongInt,
  size: LLONG_SIZE,
  alignment: LLONG_ALIGN,
  isCompatible(other: TypeInfo) {
    return sameQualifiers(this, other) && isLongLongInt(other);
  },
});

export const isLongLongInt = (t: TypeInfo): t is LongLongInt =>
  t.type === Type.LongLongInt;

export interface UnsignedLongLongInt extends ObjectTypeInfo {
  type: Type.UnsignedLongLongInt;
  size: typeof ULLONG_SIZE;
  alignment: typeof ULLONG_ALIGN;
}

export const unsignedLongLongInt = (): UnsignedLongLongInt => ({
  type: Type.UnsignedLongLongInt,
  size: ULLONG_SIZE,
  alignment: ULLONG_ALIGN,
  isCompatible(other: TypeInfo) {
    return sameQualifiers(this, other) && isUnsignedLongLongInt(other);
  },
});

export const isUnsignedLongLongInt = (t: TypeInfo): t is UnsignedLongLongInt =>
  t.type === Type.UnsignedLongLongInt;

export interface FloatType extends ObjectTypeInfo {
  type: Type.Float;
  size: typeof FLT_SIZE;
  alignment: typeof FLT_ALIGN;
}

export const floatType = (): FloatType => ({
  type: Type.Float,
  size: FLT_SIZE,
  alignment: FLT_ALIGN,
  isCompatible(other: TypeInfo) {
    return sameQualifiers(this, other) && isFloatType(other);
  },
});

export const isFloatType = (t: TypeInfo): t is FloatType => t.type === Type.Float;

export interface DoubleType extends ObjectTypeInfo {
  type: Type.Double;
  size: typeof DBL_SIZE;
  alignment: typeof DBL_ALIGN;
}

export const doubleType = (): DoubleType => ({
  type: Type.Double,
  size: DBL_SIZE,
  alignment: DBL_ALIGN,
  isCompatible(other: TypeInfo) {
    return sameQualifiers(this, other) && isDoubleType(other);
  },
});

export const isDoubleType = (t: TypeInfo): t is DoubleType => t.type === Type.Double;

export interface Array extends ObjectTypeInfo {
  type: Type.Array;
  elementType: ObjectTypeInfo;
  length: number;
  recalculateSizeAndAlignment: (depth?: number) => void;
}

export interface IncompleteArray extends BaseTypeInfo {
  type: Type.Array;
  elementType: ObjectTypeInfo;
  length: null;
}

export function array(elementType: ObjectTypeInfo, length: number): Array;
export function array(
  elementType: ObjectTypeInfo,
  length: null,
): IncompleteArray;
export function array(
  elementType: ObjectTypeInfo,
  length: number | null,
): Array | IncompleteArray;
export function array(
  elementType: ObjectTypeInfo,
  length: number | null,
): Array | IncompleteArray {
  const isCompatible = (other: TypeInfo, depth: number = 0): boolean => {
    if (depth > COMPATIBLE_CHECK_MAX_DEPTH) return true;
    return (
      isArray(other) &&
      (length === null || other.length === null || length === other.length) &&
      elementType.isCompatible(other.elementType, depth + 1)
    );
  };
  if (length === null)
    return { type: Type.Array, elementType, length, isCompatible };

  return {
    type: Type.Array,
    size: elementType.size * length,
    alignment: elementType.alignment,
    elementType,
    length,
    isCompatible,
    recalculateSizeAndAlignment(depth: number = 0) {
      if (isAggregateType(this.elementType))
        this.elementType.recalculateSizeAndAlignment(depth + 1);
      this.size = this.elementType.size * this.length;
      this.alignment = this.elementType.alignment;
    },
  };
}

export function isArray(t: ObjectTypeInfo): t is Array;
export function isArray(t: BaseTypeInfo): t is Array | IncompleteArray;
export function isArray(t: BaseTypeInfo): t is Array | IncompleteArray {
  return t.type === Type.Array;
}

export interface StructureMember {
  name?: string;
  type: ObjectTypeInfo;
  relativeAddress: number;
}

export interface Structure extends ObjectTypeInfo {
  type: Type.Structure;
  isUnion: boolean;
  tag?: string;
  members: StructureMember[];
  recalculateSizeAndAlignment: (depth?: number) => void;
}

export const structure = (
  m: {
    name?: string;
    type: ObjectTypeInfo;
  }[],
  tag?: string,
  isUnion = false,
): Structure => {
  // the alignment of a structure must be at least as strict as the alignment of its strictest member
  const strictestAlignment = Math.max(1, ...m.map((i) => i.type.alignment));
  const members: StructureMember[] = [];

  let currAddr = 0; // next free addr
  for (const i of m) {
    const relativeAddress = isUnion ? 0 : roundUpM(currAddr, i.type.alignment);
    members.push({ ...i, relativeAddress });
    currAddr = Math.max(currAddr, relativeAddress + i.type.size);
  }
  // add padding at end for array of struct
  currAddr = roundUpM(currAddr, strictestAlignment);

  const res: Structure = {
    type: Type.Structure,
    isUnion,
    size: Math.max(1, currAddr),
    alignment: strictestAlignment,
    members,
    // TODO: memoize this, currently exponential in number of nested structs
    recalculateSizeAndAlignment(depth: number = 0) {
      if (depth > COMPATIBLE_CHECK_MAX_DEPTH)
        throw new Error(
          (this.isUnion ? "union " : "struct ") +
            this.tag +
            " cannot contain itself (do you mean to use a pointer instead?)",
        );
      this.members.forEach((i) => {
        if (isAggregateType(i.type))
          i.type.recalculateSizeAndAlignment(depth + 1);
      });
      const strictestAlignment = Math.max(
        1,
        ...this.members.map((i) => i.type.alignment),
      );
      let currAddr = 0;
      for (const i of this.members) {
        i.relativeAddress = this.isUnion ? 0 : roundUpM(currAddr, i.type.alignment);
        currAddr = Math.max(currAddr, i.relativeAddress + i.type.size);
      }
      currAddr = roundUpM(currAddr, strictestAlignment);

      this.size = Math.max(1, currAddr);
      this.alignment = strictestAlignment;
    },
    isCompatible(other: TypeInfo, depth: number = 0) {
      if (depth > COMPATIBLE_CHECK_MAX_DEPTH) return true;
      return (
        isStructure(other) &&
        other.isUnion === this.isUnion &&
        sameQualifiers(this, other) &&
        other.tag === this.tag &&
        other.members.length === this.members.length &&
        other.members.reduce(
          (A, m, i) =>
            A &&
            m.name === this.members[i].name &&
            m.type.isCompatible(this.members[i].type, depth + 1),
          true,
        )
      );
    },
  };
  if (tag) res.tag = tag;
  return res;
};

export const isStructure = (t: TypeInfo): t is Structure =>
  t.type === Type.Structure;

export interface Pointer extends ObjectTypeInfo {
  type: Type.Pointer;
  // for simplicity we let all pointers have same size and alignment requirements (see 6.2.5.27)
  size: typeof INT_SIZE;
  alignment: typeof INT_ALIGN;
  referencedType: TypeInfo;
}

export const pointer = (referencedType: TypeInfo): Pointer => ({
  type: Type.Pointer,
  size: INT_SIZE,
  alignment: INT_ALIGN,
  referencedType,
  isCompatible(other: TypeInfo, depth: number = 0) {
    if (depth > COMPATIBLE_CHECK_MAX_DEPTH) return true;
    return (
      isPointer(other) &&
      sameQualifiers(this, other) &&
      other.referencedType.isCompatible(this.referencedType, depth + 1)
    );
  },
});

export const isPointer = (t: TypeInfo): t is Pointer => t.type === Type.Pointer;

export type IncompleteTypeInfo = Void | IncompleteArray;

export const isIncompleteTypeInfo = (
  i: BaseTypeInfo,
): i is IncompleteTypeInfo =>
  i.type === Type.Void || (isArray(i) && i.length === null);

export interface Void extends BaseTypeInfo {
  type: Type.Void;
}

export const voidType = (): Void => ({
  type: Type.Void,
  isCompatible(other: TypeInfo) {
    return sameQualifiers(this, other) && isVoid(other);
  },
});

export const isVoid = (t: TypeInfo): t is Void => t.type === Type.Void;

export interface FunctionTypeInfo extends BaseTypeInfo {
  type: Type.Function;
}

export const isFunctionTypeInfo = (i: BaseTypeInfo): i is FunctionTypeInfo =>
  i.type === Type.Function;

// (6.7.5.3.1) A function declarator shall not specify a return type that is a function type or an array type
export type FunctionReturnType = Exclude<TypeInfo, FunctionTypeInfo>;

export interface ParameterTypeAndIdentifier {
  identifier: Identifier | null;
  type: ObjectTypeInfo;
}

export interface FunctionType extends FunctionTypeInfo {
  type: Type.Function;
  returnType: FunctionReturnType;
  arity: number;
  parameterTypes: ParameterTypeAndIdentifier[];
}

export const functionType = (
  returnType: FunctionReturnType,
  parameterTypes: { identifier: Identifier | null; type: TypeInfo }[],
): FunctionType => {
  if (isArray(returnType)) throw "function cannot return array type";

  for (const t of parameterTypes) {
    if (isVoid(t.type) && parameterTypes.length > 1) {
      throw "function parameter cannot be an incomplete type (void), except for the case of void being the only parameter to indicate that the function has no parameters";
    }
  }

  let res: Omit<FunctionType, "isCompatible">;
  if (parameterTypes.length === 0 || isVoid(parameterTypes[0].type)) {
    res = {
      type: Type.Function,
      returnType,
      arity: 0,
      parameterTypes: [],
    };
  } else {
    const adjustedParameterTypes: ParameterTypeAndIdentifier[] = [];
    for (const i of parameterTypes) {
      const t = i.type;
      let adjustedType: ObjectTypeInfo;
      if (isArray(t)) {
        // A declaration of a parameter as array of type shall be adjusted to qualified pointer to type
        adjustedType = pointer(t.elementType);
      } else if (isFunction(t)) {
        // A declaration of a parameter as function returning type shall be adjusted to pointer to function returning type
        adjustedType = pointer(t);
      } else {
        adjustedType = t as ObjectTypeInfo;
      }
      adjustedParameterTypes.push({ ...i, type: adjustedType });
    }
    res = {
      type: Type.Function,
      returnType,
      arity: adjustedParameterTypes.length,
      parameterTypes: adjustedParameterTypes,
    };
  }

  return {
    ...res,
    isCompatible(other: TypeInfo, depth: number = 0) {
      if (depth > COMPATIBLE_CHECK_MAX_DEPTH) return true;
      return (
        isFunction(other) &&
        other.returnType.isCompatible(this.returnType, depth + 1) &&
        other.arity === this.arity &&
        other.parameterTypes.reduce(
          (A, p, i) =>
            A &&
            unqualified(p.type).isCompatible(
              unqualified(this.parameterTypes[i].type),
              depth + 1,
            ),
          true,
        )
      );
    },
  };
};

export const isFunction = (t: TypeInfo): t is FunctionType =>
  t.type === Type.Function;
