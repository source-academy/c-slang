import type { BuiltinFunction } from "../builtins";
import type { Runtime } from "../interpreter/runtime";
import { argumentInteger, stringLength, stringReader } from "../interpreter/libraryMemory";
import { TemporaryObject } from "../interpreter/object";
import { BIGINT_TO_BYTES } from "../typing/representation";
import { IntegerType, Pointer, char, constQualified, functionType, int, pointer, sizeType } from "../typing/types";

const returnValue = (rt: Runtime, type: IntegerType | Pointer, value: bigint): void => {
  rt.stash.pushWithoutConversions(new TemporaryObject(type, BIGINT_TO_BYTES[type.type](value, rt.config.endianness)));
};

const constCharPointer = () => pointer(constQualified(char()));

export const STRING_FUNCTIONS: Record<string, BuiltinFunction> = {
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
