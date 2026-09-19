import { cloneDeep } from "lodash";
import { Identifier } from "../ast/types";

export class SymbolTable {
  private blockScopes: Record<Identifier, number>[] = [];
  private fileScope: Record<Identifier, number> = {};

  enterBlock(): void {
    this.blockScopes.push({});
  }

  exitBlock(): Record<Identifier, number> {
    const res = this.blockScopes.pop();
    if (res === undefined) throw new RangeError("no block to exit");
    return res;
  }

  getAddress(id: Identifier): number {
    for (let i = this.blockScopes.length - 1; i >= 0; i--) {
      if (id in this.blockScopes[i]) {
        return this.blockScopes[i][id];
      }
    }
    if (id in this.fileScope) {
      return this.fileScope[id];
    }
    throw "identifier " + id + " not declared";
  }

  getIdentifier(addr: number): string {
    for (let i = this.blockScopes.length - 1; i >= 0; i--) {
      const res = Object.keys(this.blockScopes[i]).find(
        (k) => this.blockScopes[i][k] === addr,
      );
      if (res !== undefined) return res;
    }
    const res = Object.keys(this.fileScope).find(
      (k) => this.fileScope[k] === addr,
    );
    if (res !== undefined) return res;
    throw "address " + addr + " not found";
  }

  addAddress(id: Identifier, address: number): void {
    if (this.inFileScope) {
      if (id in this.fileScope)
        throw "identifier " + id + " already exists in file";
      this.fileScope[id] = address;
      return;
    }
    const currBlock = this.blockScopes[this.blockScopes.length - 1];
    if (id in currBlock)
      throw "identifier " + id + " already exists in current block";
    currBlock[id] = address;
  }

  get inFileScope(): boolean {
    return this.blockScopes.length === 0;
  }

  getFileScope() {
    return cloneDeep(this.fileScope);
  }

  getBlockScopes() {
    return cloneDeep(this.blockScopes);
  }
}
