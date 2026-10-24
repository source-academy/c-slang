import { Identifier } from "./ast/types";
import { STRING_FUNCTIONS } from "./builtins/string";
import { NO_EFFECTIVE_TYPE } from "./interpreter/effectiveTypeTable";
import { TemporaryObject, stringify } from "./interpreter/object";
import { Runtime } from "./interpreter/runtime";
import { StashItem, isTemporaryObject } from "./interpreter/stash";
import { BIGINT_TO_BYTES, bytesToBigint } from "./typing/representation";
import {
  FunctionType,
  Type,
  _any,
  functionType,
  int,
  isArithmeticType,
  isFunction,
  isPointer,
  isSigned,
  pointer,
  voidType,
} from "./typing/types";

export interface BuiltinFunction {
  type: FunctionType;
  visibility: "ambient" | "declarationRequired";
  body: (rt: Runtime, args: StashItem[]) => void;
}

export const BUILTIN_FUNCTIONS: Record<Identifier, BuiltinFunction> = {
  ...STRING_FUNCTIONS,
  malloc: {
    visibility: "ambient",
    type: functionType(pointer(voidType()), [
      { identifier: "size", type: int() },
    ]),
    body: (rt: Runtime, args: StashItem[]) => {
      if (args.length !== 1) throw "expected 1 arg for malloc";
      const o = args[0];
      if (!(isTemporaryObject(o) && isArithmeticType(o.typeInfo)))
        throw "expected integer arg for malloc";
      const n = Number(
        bytesToBigint(o.bytes, isSigned(o.typeInfo), rt.config.endianness),
      );

      const res = n <= 0 ? 0 : rt.heap.allocate(n);
      if (res) {
        rt.memory.storage.register({ base: res, size: n, kind: "allocated" });
        rt.initTable.remove(res, n);
        for (let i = 0; i < n; i++) {
          rt.effectiveTypeTable.add(res + i, NO_EFFECTIVE_TYPE);
        }
      }

      const t = new TemporaryObject(
        pointer(voidType()),
        BIGINT_TO_BYTES[Type.Pointer](BigInt(res), rt.config.endianness),
      );
      rt.stash.push(rt, t);
    },
  },
  free: {
    visibility: "ambient",
    type: functionType(voidType(), [
      { identifier: "ptr", type: pointer(voidType()) },
    ]),
    body: (rt: Runtime, args: StashItem[]) => {
      if (args.length !== 1) throw "expected 1 arg for free";
      const o = args[0];
      if (
        !(
          isTemporaryObject(o) &&
          isPointer(o.typeInfo) &&
          !isFunction(o.typeInfo.referencedType)
        )
      )
        throw "expected pointer to void arg for free";
      const n = Number(
        bytesToBigint(o.bytes, isSigned(o.typeInfo), rt.config.endianness),
      );

      rt.heap.free(n);
      rt.retireStorage(n);
    },
  },
  print: {
    visibility: "ambient",
    type: functionType(voidType(), [{ identifier: "obj", type: _any() }]),
    body: (rt: Runtime, args: StashItem[]) => {
      if (args.length !== 1) throw "expected 1 arg for print";
      const o = args[0];
      if (!isTemporaryObject(o)) throw "expected object for print";
      rt.appendToStdout(
        stringify(o.bytes, o.typeInfo, rt.config.endianness, rt.memory) + "\n",
      );
    },
  },
};
