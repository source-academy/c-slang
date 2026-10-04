import { Endianness, MemoryConfig, MemoryRegionConfig } from "../config";
import {
  EffectiveTypeTable,
  EffectiveTypeTableEntry,
  NO_EFFECTIVE_TYPE,
} from "../interpreter/effectiveTypeTable";
import { BIGINT_TO_BYTES } from "../typing/representation";
import {
  ObjectTypeInfo,
  ScalarType,
  getSignedVersion,
  getUnsignedVersion,
  isChar,
  isSignedChar,
  isSignedIntegerType,
  isUnsignedChar,
  isUnsignedIntegerType,
  isArray,
  isStructure,
  getTypeName,
  unqualified,
  containsConst,
} from "../typing/types";
import { decimalAddressToHex } from "../utils";
import {
  ExecuteSegmentationFault,
  SegmentationFault,
  WriteSegmentationFault,
} from "./errors";
import { MemoryRegion } from "./memoryRegion";

export interface Segments extends Record<string, MemoryRegion> {
  stack: MemoryRegion;
  heap: MemoryRegion;
  data: MemoryRegion;
  text: MemoryRegion;
}

const checkMemoryConfig = (config: MemoryConfig) => {
  const sortedRegions: MemoryRegionConfig[] = Object.values(config).sort(
    (a, b) => a.baseAddress - b.baseAddress,
  );
  for (let i = 0; i < sortedRegions.length - 1; i++) {
    const a = sortedRegions[i];
    if (
      !(
        Number.isInteger(a.baseAddress) &&
        Number.isInteger(a.size) &&
        a.baseAddress >= 0 &&
        a.size >= 0
      )
    )
      throw "base address and size should be non-negative integers";
    const b = sortedRegions[i + 1];
    if (a.baseAddress + a.size >= b.baseAddress)
      throw new RangeError("invalid memory config, regions overlap");
  }
};

export class Memory {
  private readonly segments: Segments;
  private readonly readonlyAddresses: Set<number>;
  private readonly executableAddresses: Set<number>;
  private readonly effectiveTypeTable: EffectiveTypeTable;
  private readonly skipStrictAliasingCheck: boolean;

  constructor(
    config: MemoryConfig,
    effectiveTypeTable: EffectiveTypeTable,
    skipStrictAliasingCheck: boolean = false,
  ) {
    checkMemoryConfig(config);
    this.segments = {
      stack: new MemoryRegion(config.stack),
      heap: new MemoryRegion(config.heap),
      data: new MemoryRegion(config.data),
      text: new MemoryRegion(config.text),
    };
    this.readonlyAddresses = new Set();
    this.executableAddresses = new Set();
    this.effectiveTypeTable = effectiveTypeTable;
    this.skipStrictAliasingCheck = skipStrictAliasingCheck;
  }

  private getMemoryRegion(address: number): MemoryRegion {
    for (const region of Object.values(this.segments)) {
      if (region.containsAddress(address)) return region;
    }
    throw new SegmentationFault("access " + decimalAddressToHex(address));
  }

  private getByte(address: number, toExecute: boolean = false): number {
    const region = this.getMemoryRegion(address);
    if (toExecute && !this.executableAddresses.has(address))
      throw new ExecuteSegmentationFault(address);
    return region.getByte(address - region.baseAddress);
  }

  public getBytes(
    address: number,
    size: number,
    toExecute: boolean = false,
  ): number[] {
    const res = [];
    for (let i = 0; i < size; ++i) {
      res.push(this.getByte(address + i, toExecute));
    }
    return res;
  }

  public getObjectBytes(
    address: number,
    t: ObjectTypeInfo,
    toExecute: boolean = false,
  ): number[] {
    this.getMemoryRegion(address);
    this.checkValidObjectAccess(address, t);
    return this.getBytes(address, t.size, toExecute);
  }

  private setByte(
    address: number,
    byte: number,
    readonly: boolean = false,
    executable: boolean = false,
    initializing: boolean = false,
  ): void {
    const region = this.getMemoryRegion(address);
    if (!initializing && this.readonlyAddresses.has(address))
      throw new WriteSegmentationFault(address);
    region.setByte(address - region.baseAddress, byte);
    if (readonly) this.readonlyAddresses.add(address);
    if (executable) this.executableAddresses.add(address);
  }

  public setBytes(
    address: number,
    bytes: number[],
    readonly: boolean = false,
    executable: boolean = false,
    initializing: boolean = false,
  ): void {
    for (let i = 0; i < bytes.length; i++)
      this.setByte(address + i, bytes[i], readonly, executable, initializing);
  }

  public setObjectBytes(
    address: number,
    bytes: number[],
    t: ObjectTypeInfo,
    readonly: boolean = false,
    executable: boolean = false,
    initializing: boolean = false,
  ): void {
    if (bytes.length !== t.size)
      throw new Error("object size and bytes provided don't match");

    this.getMemoryRegion(address);
    this.checkValidObjectAccess(address, t);
    if (this.effectiveTypeTable.get(address) === NO_EFFECTIVE_TYPE) {
      try {
        this.effectiveTypeTable.change(address, t);
      } catch (e) {
        throw new Error("object to be written overlaps with existing object");
      }
    }

    this.setBytes(address, bytes, readonly, executable, initializing);
  }

  public protectConstObject(address: number, t: ObjectTypeInfo): void {
    if (!containsConst(t)) return;
    if (t.const) {
      for (let i = 0; i < t.size; i++) this.readonlyAddresses.add(address + i);
    } else if (isArray(t)) {
      for (let i = 0; i < t.length; i++)
        this.protectConstObject(
          address + i * t.elementType.size,
          t.elementType,
        );
    } else if (isStructure(t) && !t.isUnion) {
      // Const union members can overlap writable alternatives.
      for (const m of t.members)
        this.protectConstObject(address + m.relativeAddress, m.type);
    }
  }

  public clearReadonly(address: number, size: number): void {
    for (let i = 0; i < size; i++) this.readonlyAddresses.delete(address + i);
  }

  public setRepeatedByte(address: number, size: number, byte: number): void {
    for (let i = 0; i < size; i++) this.setByte(address + i, byte);
  }

  public setScalar(
    address: number,
    i: bigint,
    t: ScalarType,
    e: Endianness = "little",
    readonly: boolean = false,
    executable: boolean = false,
    initializing: boolean = false,
  ): void {
    const bytes = BIGINT_TO_BYTES[t.type](i, e);
    this.setObjectBytes(address, bytes, t, readonly, executable, initializing);
  }

  private checkStrictAliasing(address: number, t: ObjectTypeInfo): boolean {
    let types: readonly EffectiveTypeTableEntry[];
    try {
      types = this.effectiveTypeTable.getTypes(address);
    } catch (e) {
      throw new Error("no object allocated at " + decimalAddressToHex(address));
    }

    if (this.skipStrictAliasingCheck) return true;
    if (types.includes(NO_EFFECTIVE_TYPE)) return true;
    if (isChar(t) || isUnsignedChar(t) || isSignedChar(t)) return true;

    for (const et of types) {
      if (et === NO_EFFECTIVE_TYPE) continue;
      if (unqualified(t).isCompatible(unqualified(et))) return true;
      if (
        isSignedIntegerType(t) &&
        getUnsignedVersion(t).isCompatible(unqualified(et))
      )
        return true;
      if (
        isUnsignedIntegerType(t) &&
        getSignedVersion(t).isCompatible(unqualified(et))
      )
        return true;
    }

    const err = types
      .map((t) => (t === NO_EFFECTIVE_TYPE ? t : getTypeName(t)))
      .join(" or ");
    throw new Error(
      "undefined behaviour: strict aliasing violated, effective type " +
        err +
        " but access of type " +
        getTypeName(t),
    );
  }

  private checkValidObjectAccess(address: number, t: ObjectTypeInfo): boolean {
    if (address % t.alignment) throw new Error("misaligned access");
    return this.checkStrictAliasing(address, t);
  }
}
