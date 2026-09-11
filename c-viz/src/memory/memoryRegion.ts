import { MemoryRegionConfig } from "../config";
import { checkValidByte } from "../utils";

export class MemoryRegion {
  public readonly size: number;
  public readonly baseAddress: number;
  private readonly dataView: DataView;

  public constructor(config: MemoryRegionConfig) {
    this.size = config.size;
    this.baseAddress = config.baseAddress;
    this.dataView = new DataView(new ArrayBuffer(this.size));
  }

  private checkValidAddress(i: number) {
    if (Number.isInteger(i) && 0 <= i && i < this.size) return;
    throw (
      "invalid address " +
      i +
      " provided, expected a non-negative integer in [0, " +
      this.size +
      ")"
    );
  }

  public setByte(byteOffset: number, byte: number): void {
    checkValidByte(byte);
    this.checkValidAddress(byteOffset);
    this.dataView.setUint8(byteOffset, byte);
  }

  public getByte(byteOffset: number): number {
    this.checkValidAddress(byteOffset);
    return this.dataView.getUint8(byteOffset);
  }

  public get topAddress(): number {
    return this.baseAddress + this.size;
  }

  public containsAddress(address: number): boolean {
    return (
      Number.isInteger(address) &&
      this.baseAddress <= address &&
      address < this.topAddress
    );
  }
}
