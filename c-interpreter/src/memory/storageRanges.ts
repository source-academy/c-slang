import { cloneDeep } from "lodash";
import { ObjectTypeInfo } from "../typing/types";

export interface StorageRange {
  base: number;
  size: number;
  kind: "automatic" | "static" | "literal" | "allocated";
  declaredType?: ObjectTypeInfo;
}

export class StorageRanges {
  private readonly ranges = new Map<number, StorageRange>();

  register(range: StorageRange): void {
    for (const existing of this.ranges.values()) {
      if (range.base < existing.base + existing.size && existing.base < range.base + range.size)
        throw new Error("overlapping live storage");
    }
    this.ranges.set(range.base, range);
  }

  remove(base: number): StorageRange | undefined {
    const range = this.ranges.get(base);
    this.ranges.delete(base);
    return range;
  }

  find(address: bigint, count: bigint): StorageRange | undefined {
    if (address <= BigInt(0) || count < BigInt(0)) return undefined;
    for (const range of this.ranges.values()) {
      const base = BigInt(range.base);
      const end = base + BigInt(range.size);
      if (address >= base && address <= end && address + count <= end)
        return range;
    }
    return undefined;
  }

  getRanges(): StorageRange[] {
    return cloneDeep([...this.ranges.values()]);
  }
}
