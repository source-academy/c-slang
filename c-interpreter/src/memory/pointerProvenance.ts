// B3.4 (scoped pointer provenance): persists a pointer value's origin tag
// across a round-trip through memory (e.g. `p = a + 10;` then later `*p`),
// keyed by the address of the pointer-typed object holding it. Diagnostic
// only - like StorageRanges' retired-range log, not a provenance guarantee.
// A pointer stored without a tracked tag simply has no entry here, which is
// exactly the fail-open behaviour the rest of B3.4 relies on.
export class PointerProvenanceTable {
  private readonly origins = new Map<number, number>();

  set(address: number, originBase: number | null): void {
    if (originBase === null) this.origins.delete(address);
    else this.origins.set(address, originBase);
  }

  get(address: number): number | null {
    return this.origins.get(address) ?? null;
  }
}
