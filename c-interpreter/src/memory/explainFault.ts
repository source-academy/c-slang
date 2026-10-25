import { decimalAddressToHex } from "../utils";
import { getTypeName } from "../typing/types";
import type { Memory } from "./memory";
import { StorageRange } from "./storageRanges";

const describeRange = (range: StorageRange): string => {
  const label = range.name ? `'${range.name}'` : "an unnamed object";
  const typeLabel = range.declaredType ? getTypeName(range.declaredType) + ", " : "";
  const at = range.declaredAt ? `, declared at line ${range.declaredAt.line}` : "";
  return `${label} (${typeLabel}${range.size} byte(s))${at}`;
};

// Resolves a faulting address to a human explanation, in priority order:
// null, the live object the address is actually inside (e.g. a readonly/const
// write - the address is perfectly valid, just forbidden for another reason),
// a nearby live object the address overran, a retired one (use-after-free /
// out-of-scope), then the bare address this interpreter always gave before
// B3.3 - the honest fallback for anything not modeled above (e.g. pointer
// arithmetic landing inside a *different* live object entirely; B1's
// documented pointer-provenance limit, only narrowed by B3.4, not lifted).
export const explainFault = (address: number, memory: Memory): string => {
  if (address === 0) return "null pointer";

  const containing = memory.storage.find(BigInt(address), BigInt(1));
  if (containing) return describeRange(containing);

  // Scoped to the same segment as `address` - otherwise "nearest preceding
  // live range" could walk clean across segments (e.g. report a stack-local
  // as "preceding" a heap address with nothing else smaller in the heap) and
  // mask a much more specific answer, like the retired-range check below.
  const region = memory.regionBoundsFor(address);
  const preceding = memory.storage.findPreceding(address);
  if (preceding && (!region || preceding.base >= region.baseAddress)) {
    const past = address - (preceding.base + preceding.size);
    return `${past} byte(s) past the end of ${describeRange(preceding)}`;
  }

  const retired = memory.storage.findRetired(address);
  if (retired) {
    const verb = retired.retiredReason === "freed" ? "freed" : "went out of scope";
    const at = retired.declaredAt ? ` at line ${retired.declaredAt.line}` : "";
    const label = retired.name ? `'${retired.name}'` : "an unnamed object";
    return `${label}, ${verb}${at} (use-after-free)`;
  }

  return decimalAddressToHex(address);
};

export const explainProvenanceMismatch = (
  foundRange: StorageRange,
  expectedOrigin: number,
  memory: Memory,
): string => {
  const originRange = memory.storage.findByBase(expectedOrigin);
  const originLabel = originRange
    ? describeRange(originRange)
    : `an object at ${decimalAddressToHex(expectedOrigin)}`;
  return (
    `pointer arithmetic from ${originLabel} produced an address inside ` +
    `the unrelated ${describeRange(foundRange)}`
  );
};
