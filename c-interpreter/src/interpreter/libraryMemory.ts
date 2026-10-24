import type { Runtime } from "./runtime";
import { StashItem, isTemporaryObject } from "./stash";
import { bytesToBigint } from "../typing/representation";
import { isSigned, isScalarType } from "../typing/types";

export const argumentInteger = (rt: Runtime, arg: StashItem): bigint => {
  if (!isTemporaryObject(arg) || !isScalarType(arg.typeInfo))
    throw new Error("expected converted native argument");
  return bytesToBigint(arg.bytes, isSigned(arg.typeInfo), rt.config.endianness);
};

export const validateSpan = (
  rt: Runtime, name: string, address: bigint, count: bigint, write = false,
) => {
  const storage = rt.memory.requireStorage(address, count, name);
  const start = Number(address);
  const size = Number(count);
  if (write) {
    try {
      rt.memory.checkWritable(start, size);
    } catch {
      throw new Error(name + ": protected destination");
    }
  }
  return { start, size, storage };
};

export const stringReader = (rt: Runtime, name: string, address: bigint) => {
  const { start, storage } = validateSpan(rt, name, address, BigInt(1));
  const available = storage.base + storage.size - start;
  return (offset: number): number => {
    if (offset >= available) throw new Error(name + ": missing terminator within live storage");
    return rt.memory.getBytes(start + offset, 1)[0];
  };
};

export const stringLength = (rt: Runtime, name: string, address: bigint): number => {
  const read = stringReader(rt, name, address);
  let length = 0;
  while (read(length) !== 0) length++;
  return length;
};

export const copyRepresentation = (
  rt: Runtime, name: string, destination: bigint, source: bigint, count: bigint,
): void => {
  const dest = validateSpan(rt, name, destination, count, true);
  const src = validateSpan(rt, name, source, count);
  if (count === BigInt(0)) return;
  if (destination < source + count && source < destination + count)
    throw new Error(name + ": overlapping ranges");

  const bytes = rt.memory.getBytes(src.start, src.size);
  const initialized = rt.initTable.getMask(src.start, src.size);
  const types = rt.effectiveTypeTable.snapshot(src.start, src.size);
  rt.memory.setBytes(dest.start, bytes);
  rt.initTable.setMask(dest.start, initialized);
  if (dest.storage.kind === "allocated")
    rt.effectiveTypeTable.replaceInferred(
      dest.storage.base, dest.storage.size, dest.start, dest.size, types,
    );
};

export const fillRepresentation = (
  rt: Runtime, name: string, destination: bigint, value: bigint, count: bigint,
): void => {
  const dest = validateSpan(rt, name, destination, count, true);
  if (count === BigInt(0)) return;
  rt.memory.setRepeatedByte(dest.start, dest.size, Number(BigInt.asUintN(8, value)));
  rt.initTable.markRange(dest.start, dest.size);
  if (dest.storage.kind === "allocated")
    rt.effectiveTypeTable.replaceInferred(dest.storage.base, dest.storage.size, dest.start, dest.size);
};
