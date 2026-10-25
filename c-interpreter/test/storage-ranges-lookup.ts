import { assert } from "chai";
import { describe, it } from "mocha";
import { StorageRange, StorageRanges } from "../src/memory/storageRanges";

const range = (base: number, size: number): StorageRange => ({ base, size, kind: "automatic" });

// The specified behaviour, written as plain linear scans to compare against.
class ReferenceRanges {
  private ranges: StorageRange[] = [];

  register(r: StorageRange): void {
    if (this.ranges.some(e => r.base < e.base + e.size && e.base < r.base + r.size))
      throw new Error("overlapping live storage");
    this.ranges.push(r);
  }

  remove(base: number): StorageRange | undefined {
    const r = this.ranges.find(e => e.base === base);
    this.ranges = this.ranges.filter(e => e.base !== base);
    return r;
  }

  find(address: bigint, count: bigint): StorageRange | undefined {
    if (address <= BigInt(0) || count < BigInt(0)) return undefined;
    const matches = this.ranges.filter(e =>
      address >= BigInt(e.base) && address + count <= BigInt(e.base + e.size));
    return matches.sort((a, b) => b.base - a.base)[0];
  }

  findPreceding(address: number): StorageRange | undefined {
    const before = this.ranges.filter(e => e.base + e.size <= address);
    return before.sort((a, b) => b.base + b.size - (a.base + a.size))[0];
  }

  findByBase(base: number): StorageRange | undefined {
    return this.ranges.find(e => e.base === base);
  }

  bases(): number[] {
    return this.ranges.map(e => e.base).sort((a, b) => a - b);
  }
}

// Deterministic PRNG (mulberry32) so a failure always reproduces.
const random = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

describe("storage range lookup", () => {
  it("matches a linear reference across random register/remove/lookup sequences", () => {
    for (let seed = 1; seed <= 200; seed++) {
      const next = random(seed);
      const int = (lo: number, hi: number) => lo + Math.floor(next() * (hi - lo + 1));
      const actual = new StorageRanges();
      const expected = new ReferenceRanges();
      for (let step = 0; step < 60; step++) {
        const roll = next();
        if (roll < 0.5) {
          const r = range(int(1, 200), int(1, 12));
          let expectedThrew = false;
          try { expected.register({ ...r }); } catch { expectedThrew = true; }
          if (expectedThrew) assert.throws(() => actual.register({ ...r }), /overlapping/);
          else actual.register({ ...r });
        } else if (roll < 0.7) {
          const bases = expected.bases();
          const base = bases.length && next() < 0.8 ? bases[int(0, bases.length - 1)] : int(1, 200);
          assert.equal(actual.remove(base, "scope-exit")?.base, expected.remove(base)?.base);
        }
        const probes = [int(-2, 215), ...expected.bases(), ...expected.bases().map(b => b + int(-1, 13))];
        for (const address of probes) {
          for (const count of [0, 1, int(2, 14)])
            assert.equal(
              actual.find(BigInt(address), BigInt(count))?.base,
              expected.find(BigInt(address), BigInt(count))?.base,
              `seed ${seed} step ${step}: find(${address}, ${count})`,
            );
          assert.equal(actual.findPreceding(address)?.base, expected.findPreceding(address)?.base,
            `seed ${seed} step ${step}: findPreceding(${address})`);
          assert.equal(actual.findByBase(address)?.base, expected.findByBase(address)?.base);
        }
        assert.deepEqual(actual.getRanges().map(r => r.base).sort((a, b) => a - b), expected.bases());
      }
    }
  });

  it("returns the object starting at a shared boundary for a zero-length lookup", () => {
    const ranges = new StorageRanges();
    ranges.register(range(10, 4));
    ranges.register(range(14, 4));
    assert.equal(ranges.find(BigInt(14), BigInt(0))?.base, 14);
    assert.equal(ranges.find(BigInt(18), BigInt(0))?.base, 14);
    assert.equal(ranges.find(BigInt(13), BigInt(1))?.base, 10);
  });

  it("rejects overlap with either neighbour or containment, and accepts exact adjacency", () => {
    const ranges = new StorageRanges();
    ranges.register(range(10, 10));
    assert.throws(() => ranges.register(range(5, 6)), /overlapping/);
    assert.throws(() => ranges.register(range(19, 6)), /overlapping/);
    assert.throws(() => ranges.register(range(12, 1)), /overlapping/);
    assert.throws(() => ranges.register(range(5, 30)), /overlapping/);
    ranges.register(range(8, 2));
    ranges.register(range(20, 2));
    assert.deepEqual(ranges.getRanges().map(r => r.base), [8, 10, 20]);
  });

  it("finds the nearest object ending at or before an address, never one containing it", () => {
    const ranges = new StorageRanges();
    ranges.register(range(30, 10));
    ranges.register(range(10, 4));
    ranges.register(range(20, 4));
    assert.equal(ranges.findPreceding(35)?.base, 20);
    assert.equal(ranges.findPreceding(24)?.base, 20);
    assert.equal(ranges.findPreceding(23)?.base, 10);
    assert.isUndefined(ranges.findPreceding(13));
  });

  it("retires exactly the removed object and nothing else", () => {
    const ranges = new StorageRanges();
    ranges.register(range(10, 4));
    ranges.register(range(14, 4));
    assert.isUndefined(ranges.remove(12, "freed"));
    assert.equal(ranges.remove(10, "freed")?.base, 10);
    assert.isUndefined(ranges.find(BigInt(11), BigInt(1)));
    assert.equal(ranges.find(BigInt(14), BigInt(1))?.base, 14);
    assert.equal(ranges.findRetired(11)?.retiredReason, "freed");
    assert.isUndefined(ranges.findRetired(15));
  });
});
