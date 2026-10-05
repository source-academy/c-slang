import {
  FunctionType,
  char,
  isArray,
  isChar,
  isFloatingType,
  isCharacterType,
  isPointer,
  isScalarType,
  isSigned,
  isStructure,
} from "./../typing/types";
import { Identifier } from "./../ast/types";
import { ObjectTypeInfo } from "../typing/types";
import { checkValidByte, decimalAddressToHex } from "../utils";
import { Memory } from "../memory/memory";
import { Endianness } from "../config";
import { bytesToBigint, bytesToFloat } from "../typing/representation";

interface Identifiable {
  identifier: Identifier;
}

interface Addressable {
  address: number;
}

interface IdentifiableAndAddressable extends Identifiable, Addressable {}

export class FunctionDesignator implements IdentifiableAndAddressable {
  public readonly typeInfo: FunctionType;
  public readonly address: number;
  public readonly identifier: Identifier;

  public constructor(
    typeInfo: FunctionType,
    address: number,
    identifier: Identifier,
  ) {
    this.typeInfo = typeInfo;
    this.address = address;
    this.identifier = identifier;
  }
}

// https://en.cppreference.com/w/cpp/language/object
abstract class CvizObject {
  public readonly typeInfo: ObjectTypeInfo;
  public readonly size: number;

  public constructor(typeInfo: ObjectTypeInfo) {
    this.typeInfo = typeInfo;
    this.size = typeInfo.size;
  }

  public abstract get bytes(): number[];
}

export class TemporaryObject extends CvizObject {
  private readonly _bytes: number[];
  public readonly address: number | null;

  public constructor(
    typeInfo: ObjectTypeInfo,
    bytes: number[],
    address: number | null = null,
  ) {
    super(typeInfo);
    if (typeInfo.size !== bytes.length) {
      throw (
        "invalid number of bytes provided, expected " +
        typeInfo.size +
        " got " +
        bytes.length
      );
    }
    bytes.forEach(checkValidByte);
    this._bytes = bytes;
    this.address = address;
  }

  public get bytes() {
    return structuredClone(this._bytes);
  }
}

export class RuntimeObject
  extends CvizObject
  implements IdentifiableAndAddressable
{
  public readonly address: number;
  public initialized: boolean;
  private readonly memory: Memory;
  private _identifier: Identifier;

  public constructor(
    typeInfo: ObjectTypeInfo,
    address: number,
    identifier: Identifier,
    memory: Memory,
  ) {
    super(typeInfo);
    this.address = address;
    if (address % typeInfo.alignment)
      throw (
        "misaligned address (" +
        address +
        " with alignment " +
        typeInfo.alignment +
        ")"
      );
    this._identifier = identifier;
    this.memory = memory;
    this.initialized = false;
  }

  public get bytes() {
    return this.memory.getObjectBytes(this.address, this.typeInfo);
  }

  public get identifier() {
    return this._identifier;
  }

  public setIdentifier(i: Identifier) {
    this._identifier = i;
  }
}

// Walks memory from a char*'s address until a null terminator, the same
// way a real strlen/printf("%s", ...) would - so it throws naturally,
// like any other out-of-bounds access in this interpreter, if the
// pointer was never actually null-terminated.
const stringifyCString = (address: number, memory: Memory): string => {
  let s = "";
  for (;;) {
    const [byte] = memory.getObjectBytes(address + s.length, char());
    if (byte === 0) break;
    s += String.fromCharCode(byte);
  }
  return JSON.stringify(s);
};

export const stringify = (
  bytes: number[],
  t: ObjectTypeInfo,
  endianness: Endianness,
  memory: Memory,
): string => {
  if (bytes.length !== t.size)
    throw new Error("number of bytes do not match type given");
  if (isFloatingType(t)) {
    const value = bytesToFloat(bytes, t.type, endianness);
    return Object.is(value, -0) ? "-0" : value.toString();
  }
  if (isScalarType(t)) {
    const n = bytesToBigint(bytes, isSigned(t), endianness);
    if (isChar(t)) return "'" + encodeURI(String.fromCharCode(Number(n))) + "'";
    if (isPointer(t)) {
      if (n === BigInt(0)) return "NULL";
      if (isCharacterType(t.referencedType))
        return stringifyCString(Number(n), memory);
      return decimalAddressToHex(Number(n));
    }
    return n.toString();
  }
  if (isArray(t)) {
    const et = t.elementType;
    const res = [];
    for (let i = 0; i < t.size; i += et.size) {
      res.push(stringify(bytes.slice(i, i + et.size), et, endianness, memory));
    }
    return "[" + res.join(", ") + "]";
  }
  if (isStructure(t)) {
    const res = [];
    for (const i of t.members) {
      const b = bytes.slice(i.relativeAddress, i.relativeAddress + i.type.size);
      res.push(stringify(b, i.type, endianness, memory));
    }
    return (t.tag || "") + "{" + res.join(", ") + "}";
  }
  return "?";
};
