import { Endianness } from "../config";
import {
  CHAR_SIZE,
  DBL_SIZE,
  FLT_SIZE,
  INT_SIZE,
  LLONG_SIZE,
  LONG_SIZE,
  SCHAR_SIZE,
  SHRT_SIZE,
  UCHAR_SIZE,
  UINT_SIZE,
  ULLONG_SIZE,
  ULONG_SIZE,
  USHRT_SIZE,
} from "../constants";
import { checkValidByte, mod } from "../utils";
import { getNumericalLimitFromSpecifiers } from "./specifiers";
import { FloatingType, IntegerType, Pointer, Type } from "./types";

const checkInputInRange = (i: bigint, s: string): void => {
  const [min, max] = getNumericalLimitFromSpecifiers(s);
  if (min <= i && i <= max) return;
  throw new Error(
    "undefined behaviour: " + i.toString() + " out of range for type " + s,
  );
};

const clamp = (i: bigint, s: string): bigint => {
  const max = getNumericalLimitFromSpecifiers(s)[1];
  return mod(i, max + BigInt(1));
};

const bigintToBytes = (
  b: bigint,
  n: number,
  e: Endianness = "little",
): number[] => {
  const res = [];
  for (let i = 0; i < n; i++) {
    const byte = b & BigInt(0xff);
    res.push(Number(BigInt.asUintN(8, byte)));
    b >>= BigInt(8);
  }
  if (e === "big") res.reverse();
  return res;
};

export const bytesToBigint = (
  bytes: number[],
  signed: boolean,
  e: Endianness = "little",
): bigint => {
  bytes = structuredClone(bytes);
  bytes.forEach(checkValidByte);
  if (e === "little") bytes.reverse();
  const isNegative = signed && bytes[0] & 0x80;
  let res = BigInt(0);
  for (const byte of bytes) {
    res <<= BigInt(8);
    res |= BigInt(isNegative ? 255 - byte : byte);
  }
  if (isNegative) res = -(res + BigInt(1));
  return res;
};

export const BIGINT_TO_BYTES: Record<
  (IntegerType | Pointer)["type"],
  (i: bigint, e: Endianness) => number[]
> = {
  [Type._Bool]: (i: bigint, e: Endianness = "little") => {
    return bigintToBytes(i === BigInt(0) ? i : BigInt(1), UCHAR_SIZE, e);
  },
  [Type.Char]: (i: bigint, e: Endianness = "little") => {
    checkInputInRange(i, "char");
    return bigintToBytes(i, CHAR_SIZE, e);
  },
  [Type.SignedChar]: (i: bigint, e: Endianness = "little") => {
    checkInputInRange(i, "signed char");
    return bigintToBytes(i, SCHAR_SIZE, e);
  },
  [Type.UnsignedChar]: (i: bigint, e: Endianness = "little") => {
    const n = clamp(i, "unsigned char");
    return bigintToBytes(n, UCHAR_SIZE, e);
  },
  [Type.ShortInt]: (i: bigint, e: Endianness = "little") => {
    checkInputInRange(i, "short");
    return bigintToBytes(i, SHRT_SIZE, e);
  },
  [Type.UnsignedShortInt]: (i: bigint, e: Endianness = "little") => {
    const n = clamp(i, "unsigned short");
    return bigintToBytes(n, USHRT_SIZE, e);
  },
  [Type.Int]: (i: bigint, e: Endianness = "little") => {
    checkInputInRange(i, "int");
    return bigintToBytes(i, INT_SIZE, e);
  },
  [Type.UnsignedInt]: (i: bigint, e: Endianness = "little") => {
    const n = clamp(i, "unsigned int");
    return bigintToBytes(n, UINT_SIZE, e);
  },
  [Type.LongInt]: (i: bigint, e: Endianness = "little") => {
    checkInputInRange(i, "long int");
    return bigintToBytes(i, LONG_SIZE, e);
  },
  [Type.UnsignedLongInt]: (i: bigint, e: Endianness = "little") => {
    const n = clamp(i, "unsigned long int");
    return bigintToBytes(n, ULONG_SIZE, e);
  },
  [Type.LongLongInt]: (i: bigint, e: Endianness = "little") => {
    checkInputInRange(i, "long long int");
    return bigintToBytes(i, LLONG_SIZE, e);
  },
  [Type.UnsignedLongLongInt]: (i: bigint, e: Endianness = "little") => {
    const n = clamp(i, "unsigned long long");
    return bigintToBytes(n, ULLONG_SIZE, e);
  },
  [Type.Pointer]: (i: bigint, e: Endianness = "little") => {
    const n = clamp(i, "unsigned int");
    return bigintToBytes(n, INT_SIZE, e);
  },
};

export const FLOAT_TO_BYTES: Record<
  FloatingType["type"],
  (value: number, e?: Endianness) => number[]
> = {
  [Type.Float]: (value, e = "little") => {
    const buffer = new ArrayBuffer(FLT_SIZE);
    new DataView(buffer).setFloat32(0, Math.fround(value), e === "little");
    return Array.from(new Uint8Array(buffer));
  },
  [Type.Double]: (value, e = "little") => {
    const buffer = new ArrayBuffer(DBL_SIZE);
    new DataView(buffer).setFloat64(0, value, e === "little");
    return Array.from(new Uint8Array(buffer));
  },
};

export const bytesToFloat = (
  bytes: number[],
  type: FloatingType["type"],
  e: Endianness = "little",
): number => {
  const size = type === Type.Float ? FLT_SIZE : DBL_SIZE;
  if (bytes.length !== size)
    throw new RangeError("invalid byte length for " + type + ": expected " + size);
  bytes.forEach(checkValidByte);
  const view = new DataView(Uint8Array.from(bytes).buffer);
  return type === Type.Float
    ? view.getFloat32(0, e === "little")
    : view.getFloat64(0, e === "little");
};
