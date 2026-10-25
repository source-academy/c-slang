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
  // Sorted by base. Live ranges never overlap, so their ends are sorted too,
  // and every lookup is a binary search rather than a scan of every object.
  private readonly ranges: StorageRange[] = [];
  private readonly retired: RetiredRange[] = [];

  // Number of leading ranges for which `before` holds.
  private countWhile(before: (range: StorageRange) => boolean): number {
    let lo = 0;
    let hi = this.ranges.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (before(this.ranges[mid])) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  }

  private lastStartingAtOrBefore(address: number): number {
    return this.countWhile(range => range.base <= address) - 1;
  }

  register(range: StorageRange): void {
    const i = this.countWhile(existing => existing.base <= range.base);
    const overlaps = (existing: StorageRange | undefined) =>
      existing !== undefined &&
      range.base < existing.base + existing.size &&
      existing.base < range.base + range.size;
    if (overlaps(this.ranges[i - 1]) || overlaps(this.ranges[i]))
      throw new Error("overlapping live storage");
    this.ranges.splice(i, 0, range);
  }

  remove(base: number, reason: RetiredReason): StorageRange | undefined {
    const i = this.lastStartingAtOrBefore(base);
    const range: StorageRange | undefined = this.ranges[i];
    if (range?.base !== base) return undefined;
    this.ranges.splice(i, 1);
    this.retired.push({ ...range, retiredReason: reason });
    if (this.retired.length > RETIRED_LOG_CAPACITY) this.retired.shift();
    return range;
  }

  // For a zero-length lookup at the boundary between two adjacent objects,
  // the one starting there wins over the one ending there.
  find(address: bigint, count: bigint): StorageRange | undefined {
    if (address <= BigInt(0) || count < BigInt(0)) return undefined;
    const i = this.lastStartingAtOrBefore(Number(address));
    for (const range of [this.ranges[i], this.ranges[i - 1]] as (StorageRange | undefined)[]) {
      if (range === undefined) continue;
      if (address >= BigInt(range.base) && address + count <= BigInt(range.base + range.size))
        return range;
    }
    return undefined;
  }

  // Nearest live range ending at or before `address`, for "N bytes past X"
  // wording. Only considers ranges that actually end at or before the address -
  // a range strictly containing it is a different (non-fault) situation.
  findPreceding(address: number): StorageRange | undefined {
    return this.ranges[this.countWhile(range => range.base + range.size <= address) - 1];
  }

  findRetired(address: number): RetiredRange | undefined {
    for (let i = this.retired.length - 1; i >= 0; i--) {
      const range = this.retired[i];
      if (address >= range.base && address < range.base + range.size) return range;
    }
    return undefined;
  }

  findByBase(base: number): StorageRange | undefined {
    const range: StorageRange | undefined = this.ranges[this.lastStartingAtOrBefore(base)];
    return range?.base === base ? range : undefined;
  }

  // In address order.
  getRanges(): StorageRange[] {
    return cloneDeep(this.ranges);
  }
}
