import { cloneDeep } from "lodash";
import { ObjectTypeInfo } from "../typing/types";
import { PositionInfo } from "../ast/types";

export interface StorageRange {
  base: number;
  size: number;
  kind: "automatic" | "static" | "literal" | "allocated";
  declaredType?: ObjectTypeInfo;
  // B3.2: a declared identifier and source position, for fault messages that
  // name what was being accessed instead of a bare address. Absent for
  // allocations and literals, which have no declared name.
  name?: string | undefined;
  declaredAt?: PositionInfo | undefined;
}

export type RetiredReason = "freed" | "scope-exit";

export interface RetiredRange extends StorageRange {
  retiredReason: RetiredReason;
}

// Diagnostic only, not a provenance guarantee: lets a fault shortly after a
// free() or scope exit still say what used to be there. Capped so this never
// grows unbounded over a long-running program.
const RETIRED_LOG_CAPACITY = 64;

export class StorageRanges {
  private readonly ranges = new Map<number, StorageRange>();
  private readonly retired: RetiredRange[] = [];

  register(range: StorageRange): void {
    for (const existing of this.ranges.values()) {
      if (range.base < existing.base + existing.size && existing.base < range.base + range.size)
        throw new Error("overlapping live storage");
    }
    this.ranges.set(range.base, range);
  }

  remove(base: number, reason: RetiredReason): StorageRange | undefined {
    const range = this.ranges.get(base);
    this.ranges.delete(base);
    if (range) {
      this.retired.push({ ...range, retiredReason: reason });
      if (this.retired.length > RETIRED_LOG_CAPACITY) this.retired.shift();
    }
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

  // Nearest live range ending at or before `address`, for "N bytes past X"
  // wording. Only considers ranges that actually end at or before the address -
  // a range strictly containing it is a different (non-fault) situation.
  findPreceding(address: number): StorageRange | undefined {
    let best: StorageRange | undefined;
    for (const range of this.ranges.values()) {
      if (range.base + range.size > address) continue;
      if (!best || range.base + range.size > best.base + best.size) best = range;
    }
    return best;
  }

  findRetired(address: number): RetiredRange | undefined {
    for (let i = this.retired.length - 1; i >= 0; i--) {
      const range = this.retired[i];
      if (address >= range.base && address < range.base + range.size) return range;
    }
    return undefined;
  }

  findByBase(base: number): StorageRange | undefined {
    return this.ranges.get(base);
  }

  getRanges(): StorageRange[] {
    return cloneDeep([...this.ranges.values()]);
  }
}
