import { cloneDeep } from "lodash";
import {
  ObjectTypeInfo,
  constQualified,
  isArray,
  isScalarType,
  isStructure,
  unqualified,
} from "../typing/types";
import { decimalAddressToHex } from "../utils";

export const NO_EFFECTIVE_TYPE = "NO_EFFECTIVE_TYPE";

export type EffectiveTypeTableEntry = ObjectTypeInfo | typeof NO_EFFECTIVE_TYPE;

export interface RepresentationType {
  offset: number;
  type: ObjectTypeInfo;
}

export class EffectiveTypeTable {
  private readonly table: Record<number, EffectiveTypeTableEntry[]> = {};

  add(address: number, t: EffectiveTypeTableEntry): void {
    for (let i = 0; i < (t === NO_EFFECTIVE_TYPE ? 1 : t.size); i++)
      this.checkNotInTable(address + i);

    this.addSubobjects(address, t);
  }

  private addSubobjects(address: number, t: EffectiveTypeTableEntry): void {
    // Union alternatives may begin at the same address.
    (this.table[address] ??= []).push(t);
    if (t === NO_EFFECTIVE_TYPE || isScalarType(t)) {
      return;
    }

    if (isArray(t)) {
      for (let i = 0; i < t.length; i++)
        this.addSubobjects(address + i * t.elementType.size, t.elementType);
      return;
    }

    if (isStructure(t)) {
      t.members.forEach((m) =>
        this.addSubobjects(
          address + m.relativeAddress,
          t.const ? constQualified(m.type) : m.type,
        ),
      );
      return;
    }

    throw new Error("invalid object type");
  }

  get(address: number): EffectiveTypeTableEntry {
    return this.getTypes(address)[0];
  }

  getTypes(address: number): readonly EffectiveTypeTableEntry[] {
    this.checkInTable(address);
    return this.table[address];
  }

  remove(address: number, size: number | null = null): void {
    let s: number;
    if (size === null) {
      this.checkInTable(address);
      const t = this.get(address);
      if (t === NO_EFFECTIVE_TYPE)
        throw new Error("invalid call to remove effective types");
      s = t.size;
    } else s = size;
    for (let i = 0; i < s; i++) {
      if (address + i in this.table) delete this.table[address + i];
    }
  }

  change(address: number, t: ObjectTypeInfo): void {
    for (let i = 0; i < t.size; i++) {
      if (this.get(address + i) !== NO_EFFECTIVE_TYPE)
        throw new Error(
          "can only change effective type of memory with no effective type",
        );
    }
    this.remove(address, t.size);
    this.add(address, t);
  }

  snapshot(address: number, size: number): RepresentationType[] {
    const result: RepresentationType[] = [];
    for (const [key, types] of Object.entries(this.table)) {
      const start = Number(key);
      for (const type of types) {
        if (type !== NO_EFFECTIVE_TYPE && start >= address && start + type.size <= address + size)
          result.push({ offset: start - address, type: unqualified(type) });
      }
    }
    return result;
  }

  // Only for storage without a declared type; ownership lives in StorageRanges.
  replaceInferred(
    base: number, extent: number, address: number, size: number,
    replacements: readonly RepresentationType[] = [],
  ): void {
    if (size === 0) return;
    for (const [key, types] of Object.entries(this.table)) {
      const start = Number(key);
      if (start < base || start >= base + extent) continue;
      const retained = types.filter(t => t !== NO_EFFECTIVE_TYPE &&
        (start + t.size <= address || start >= address + size));
      if (retained.length) this.table[start] = retained;
      else delete this.table[start];
    }
    for (const { offset, type } of replacements)
      (this.table[address + offset] ??= []).push(type);

    const covered = new Set<number>();
    for (const [key, types] of Object.entries(this.table)) {
      const start = Number(key);
      if (start < base || start >= base + extent) continue;
      for (const type of types) {
        if (type === NO_EFFECTIVE_TYPE) continue;
        for (let i = start; i < start + type.size; i++) covered.add(i);
      }
    }
    for (let i = base; i < base + extent; i++)
      if (!covered.has(i)) this.table[i] = [NO_EFFECTIVE_TYPE];
  }

  establishInferred(base: number, extent: number, address: number, t: ObjectTypeInfo): void {
    if (this.table[address]?.some(type => type !== NO_EFFECTIVE_TYPE &&
      unqualified(type).isCompatible(unqualified(t)))) return;
    const description = new EffectiveTypeTable();
    description.add(0, t);
    this.replaceInferred(base, extent, address, t.size, description.snapshot(0, t.size));
  }

  getTable() {
    const primaryTypes: Record<number, EffectiveTypeTableEntry> = {};
    for (const [address, types] of Object.entries(this.table))
      primaryTypes[Number(address)] = types[0];
    return cloneDeep(primaryTypes);
  }

  checkInTable(address: number): void {
    if (!(address in this.table))
      throw new Error(
        "address " +
          decimalAddressToHex(address) +
          " not in effective type table",
      );
  }

  checkNotInTable(address: number): void {
    if (address in this.table)
      throw new Error(
        "address " +
          decimalAddressToHex(address) +
          " already has effective type",
      );
  }
}
