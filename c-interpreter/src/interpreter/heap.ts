import { cloneDeep } from "lodash";
import { roundUpM } from "../utils";
import { MAX_ALIGN } from "../constants";

export type HeapEntry = { size: number };

export class Heap {
  private readonly allocations: Record<number, HeapEntry>;

  private _memUsage: number;
  private heapStart: number;
  private heapEnd: number;

  constructor(heapStart: number, heapEnd: number) {
    this.allocations = {};
    this.heapStart = heapStart;
    this.heapEnd = heapEnd;
    this._memUsage = 0;
  }

  public allocate(size: number): number {
    let curr = this.heapStart;
    let ok = false;
    Object.keys(this.allocations)
      .map(Number)
      .sort()
      .forEach((i) => {
        if (ok || i - roundUpM(curr, MAX_ALIGN) >= size) {
          ok = true;
          return;
        }
        curr = i + this.allocations[i].size;
      });
    if (!ok && this.heapEnd - roundUpM(curr, MAX_ALIGN) >= size) ok = true;
    if (!ok) return 0;
    curr = roundUpM(curr, MAX_ALIGN);
    this.allocations[curr] = { size };
    this._memUsage += size;
    return curr;
  }

  public free(addr: number): void {
    if (!(addr in this.allocations))
      throw new Error(
        "undefined behaviour: free on address not returned by malloc",
      );
    this._memUsage -= this.allocations[addr].size;
    delete this.allocations[addr];
  }

  public get memUsage() {
    return this._memUsage;
  }

  public getBlockSize(addr: number): number {
    if (!(addr in this.allocations)) return 0;
    return this.allocations[addr].size;
  }

  public getAllocations(): Record<number, HeapEntry> {
    return cloneDeep(this.allocations);
  }
}
