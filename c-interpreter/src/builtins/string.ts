import type { BuiltinFunction } from "../builtins";
import type { Runtime } from "../interpreter/runtime";
import { argumentInteger, copyRepresentation, fillRepresentation, stringLength, stringReader } from "../interpreter/libraryMemory";
import { TemporaryObject } from "../interpreter/object";
import { BIGINT_TO_BYTES } from "../typing/representation";
import { IntegerType, Pointer, char, constQualified, functionType, int, pointer, sizeType, voidType } from "../typing/types";

const returnValue = (rt: Runtime, type: IntegerType | Pointer, value: bigint): void => {
  rt.stash.pushWithoutConversions(new TemporaryObject(type, BIGINT_TO_BYTES[type.type](value, rt.config.endianness)));
};

const constCharPointer = () => pointer(constQualified(char()));

export const STRING_FUNCTIONS: Record<string, BuiltinFunction> = {
  memcpy: {
    visibility: "declarationRequired",
    type: functionType(pointer(voidType()), [
      { identifier: "dest", type: pointer(voidType()) },
      { identifier: "src", type: pointer(constQualified(voidType())) },
      { identifier: "count", type: sizeType() },
    ]),
    body: (rt, args) => {
      const dest = argumentInteger(rt, args[0]);
      copyRepresentation(rt, "memcpy", dest, argumentInteger(rt, args[1]), argumentInteger(rt, args[2]));
      returnValue(rt, pointer(voidType()), dest);
    },
  },
  strcpy: {
    visibility: "declarationRequired",
    type: functionType(pointer(char()), [
      { identifier: "dest", type: pointer(char()) },
      { identifier: "src", type: constCharPointer() },
    ]),
    body: (rt, args) => {
      const dest = argumentInteger(rt, args[0]);
      const src = argumentInteger(rt, args[1]);
      const count = BigInt(stringLength(rt, "strcpy", src) + 1);
      copyRepresentation(rt, "strcpy", dest, src, count);
      returnValue(rt, pointer(char()), dest);
    },
  },
  memset: {
    visibility: "declarationRequired",
    type: functionType(pointer(voidType()), [
      { identifier: "dest", type: pointer(voidType()) },
      { identifier: "value", type: int() },
      { identifier: "count", type: sizeType() },
    ]),
    body: (rt, args) => {
      const dest = argumentInteger(rt, args[0]);
      fillRepresentation(rt, "memset", dest, argumentInteger(rt, args[1]), argumentInteger(rt, args[2]));
      returnValue(rt, pointer(voidType()), dest);
    },
  },
  strlen: {
    visibility: "declarationRequired",
    type: functionType(sizeType(), [{ identifier: "s", type: constCharPointer() }]),
    body: (rt, args) => {
      const length = stringLength(rt, "strlen", argumentInteger(rt, args[0]));
      returnValue(rt, sizeType(), BigInt(length));
    },
  },
  strcmp: {
    visibility: "declarationRequired",
    type: functionType(int(), [
      { identifier: "left", type: constCharPointer() },
      { identifier: "right", type: constCharPointer() },
    ]),
    body: (rt, args) => {
      const left = stringReader(rt, "strcmp", argumentInteger(rt, args[0]));
      const right = stringReader(rt, "strcmp", argumentInteger(rt, args[1]));
      for (let i = 0; ; i++) {
        const a = left(i), b = right(i);
        if (a !== b || a === 0) {
          returnValue(rt, int(), BigInt(a < b ? -1 : a > b ? 1 : 0));
          return;
        }
      }
    },
  },
};
