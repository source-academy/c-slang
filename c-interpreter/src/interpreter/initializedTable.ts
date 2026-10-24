import { cloneDeep } from "lodash";
import { ObjectTypeInfo, isStructure } from "../typing/types";

export class InitializedTable {
  private table: Record<number, boolean> = {};

  public add(addr: number, t: ObjectTypeInfo): void {
    this.markRange(addr, t.size);
  }

  public markRange(addr: number, size: number): void {
    for (let i = addr; i < addr + size; i++) this.table[i] = true;
  }

  public getMask(addr: number, size: number): boolean[] {
    return Array.from({ length: size }, (_, i) => this.table[addr + i] === true);
  }

  public setMask(addr: number, mask: readonly boolean[]): void {
    mask.forEach((initialized, i) => {
      if (initialized) this.table[addr + i] = true;
      else delete this.table[addr + i];
    });
  }

  public check(addr: number, t: ObjectTypeInfo): boolean {
    if (isStructure(t)) {
      return t.members.reduce(
        (A, i) => A && this.check(addr + i.relativeAddress, i.type),
        true,
      );
    }
    for (let i = addr; i < addr + t.size; i++)
      if (!(i in this.table)) return false;
    return true;
  }

  public remove(addr: number, size: number): void {
    for (let i = addr; i < addr + size; i++) {
      if (i in this.table) delete this.table[i];
    }
  }

  public getTable() {
    return cloneDeep(this.table);
  }
}
