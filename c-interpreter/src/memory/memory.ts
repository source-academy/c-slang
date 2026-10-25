import { Endianness, MemoryConfig, MemoryRegionConfig } from "../config";
import {
  EffectiveTypeTable,
  EffectiveTypeTableEntry,
  NO_EFFECTIVE_TYPE,
} from "../interpreter/effectiveTypeTable";
import { BIGINT_TO_BYTES } from "../typing/representation";
import {
  ObjectTypeInfo,
  IntegerType,
  Pointer,
  getSignedVersion,
  getUnsignedVersion,
  isSignedIntegerType,
  isUnsignedIntegerType,
  isArray,
  isStructure,
  getTypeName,
  unqualified,
  containsConst,
  isCharacterType,
  array,
} from "../typing/types";
import {
  ExecuteSegmentationFault,
  PointerProvenanceFault,
  SegmentationFault,
  WriteSegmentationFault,
} from "./errors";
import { explainFault, explainProvenanceMismatch } from "./explainFault";
import { MemoryRegion } from "./memoryRegion";
import { PointerProvenanceTable } from "./pointerProvenance";
import { StorageRange, StorageRanges } from "./storageRanges";

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

// C17 array qualification is carried by the element type.
const unqualifiedAccessType = (type: ObjectTypeInfo): ObjectTypeInfo =>
  isArray(type) ? array(unqualifiedAccessType(type.elementType), type.length) : unqualified(type);

export class Memory {
  public readonly storage = new StorageRanges();
  public readonly pointerProvenance = new PointerProvenanceTable();
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
    throw new SegmentationFault("access " + explainFault(address, this));
  }

  // Bounds of whichever segment (stack/heap/data/text) address falls in, for
  // explainFault's "nearest preceding object" search - without this, that
  // search could walk clean across segments (e.g. report a stack-local as
  // "preceding" a heap address just because nothing else is smaller) and mask
  // a much more specific answer (B3.3).
  public regionBoundsFor(address: number): { baseAddress: number; topAddress: number } | undefined {
    for (const region of Object.values(this.segments)) {
      if (region.containsAddress(address))
        return { baseAddress: region.baseAddress, topAddress: region.topAddress };
    }
    return undefined;
  }

  private getByte(address: number, toExecute: boolean = false): number {
    const region = this.getMemoryRegion(address);
    if (toExecute && !this.executableAddresses.has(address))
      throw new ExecuteSegmentationFault(explainFault(address, this));
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
    expectedOrigin?: number,
  ): number[] {
    this.getMemoryRegion(address);
    this.checkValidObjectAccess(address, t, expectedOrigin);
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
      throw new WriteSegmentationFault(explainFault(address, this));
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
    expectedOrigin?: number,
  ): void {
    if (bytes.length !== t.size)
      throw new Error("object size and bytes provided don't match");

    this.getMemoryRegion(address);
    const allocation = this.storage.find(BigInt(address), BigInt(t.size));
    if (!allocation && this.storage.find(BigInt(address), BigInt(1)))
      throw new Error("object write: invalid storage range");
    if (allocation?.kind === "allocated") {
      if (address % t.alignment) throw new Error("misaligned access");
      if (!initializing) this.checkWritable(address, t.size);
      if (isCharacterType(t))
        this.effectiveTypeTable.replaceInferred(allocation.base, allocation.size, address, t.size);
      else
        this.effectiveTypeTable.establishInferred(allocation.base, allocation.size, address, t);
    } else {
      this.checkValidObjectAccess(address, t, expectedOrigin);
    }
    if (!allocation && this.effectiveTypeTable.get(address) === NO_EFFECTIVE_TYPE) {
      try {
        this.effectiveTypeTable.change(address, t);
      } catch (e) {
        throw new Error("object to be written overlaps with existing object");
      }
    }

    this.setBytes(address, bytes, readonly, executable, initializing);
  }

  // Kept as a plain Error, not a MemoryError: library validation helpers
  // (libraryMemory.ts) match this message with their own `"name: reason"`
  // convention (see e.g. test/b1-string-rejections.ts), which explainFault's
  // richer wording would break. checkStrictAliasing below is the one that
  // needs B3.3's enrichment - it's what a *typed* object access actually hits.
  public requireStorage(address: bigint, size: bigint, operation: string): StorageRange {
    if (address === BigInt(0)) throw new Error(operation + ": null pointer");
    const range = this.storage.find(address, size);
    if (!range) throw new Error(operation + ": invalid storage range");
    return range;
  }

  public checkWritable(address: number, size: number): void {
    for (let i = address; i < address + size; i++)
      if (this.readonlyAddresses.has(i))
        throw new WriteSegmentationFault(explainFault(i, this));
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
    t: IntegerType | Pointer,
    e: Endianness = "little",
    readonly: boolean = false,
    executable: boolean = false,
    initializing: boolean = false,
  ): void {
    const bytes = BIGINT_TO_BYTES[t.type](i, e);
    this.setObjectBytes(address, bytes, t, readonly, executable, initializing);
  }

  private checkStrictAliasing(address: number, t: ObjectTypeInfo): boolean {
    if (isCharacterType(t)) {
      this.requireStorage(BigInt(address), BigInt(t.size), "character access");
      return true;
    }
    let types: readonly EffectiveTypeTableEntry[];
    try {
      types = this.effectiveTypeTable.getTypes(address);
    } catch (e) {
      // The real site a *typed* out-of-bounds/use-after-free access hits:
      // requireStorage's own guard in checkValidObjectAccess only fires when
      // something is already registered at the first byte, so an address with
      // no live range at all falls through to here instead (B3.3).
      throw new SegmentationFault("access " + explainFault(address, this));
    }

    if (this.skipStrictAliasingCheck) return true;
    if (types.includes(NO_EFFECTIVE_TYPE)) return true;

    for (const et of types) {
      if (et === NO_EFFECTIVE_TYPE) continue;
      if (unqualifiedAccessType(t).isCompatible(unqualifiedAccessType(et))) return true;
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

  private checkValidObjectAccess(
    address: number,
    t: ObjectTypeInfo,
    expectedOrigin?: number,
  ): boolean {
    if (address % t.alignment) throw new Error("misaligned access");
    const firstByteRange = this.storage.find(BigInt(address), BigInt(1));
    if (firstByteRange) {
      // B3.4: the address resolves to a live object, but not necessarily the
      // one a pointer's own arithmetic claims to be derived from - catches
      // out-of-bounds arithmetic landing exactly inside a *different* live
      // object, which plain segment/range membership can't tell apart from a
      // legitimate access. Only checked when the caller tracked a tag;
      // otherwise this fails open, same as before B3.4.
      if (expectedOrigin !== undefined && firstByteRange.base !== expectedOrigin)
        throw new PointerProvenanceFault(
          explainProvenanceMismatch(firstByteRange, expectedOrigin, this),
        );
      this.requireStorage(BigInt(address), BigInt(t.size), "object access");
    }
    return this.checkStrictAliasing(address, t);
  }
}
