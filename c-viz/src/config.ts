export interface MemoryRegionConfig {
  size: number;
  baseAddress: number;
}

export interface MemoryConfig {
  stack: MemoryRegionConfig;
  heap: MemoryRegionConfig;
  data: MemoryRegionConfig;
  text: MemoryRegionConfig;
}

export type Endianness = "little" | "big";

export interface UBConfig {
  skipStrictAliasingCheck: boolean;
}

export interface RuntimeConfig {
  memory: MemoryConfig;
  endianness: Endianness;
  UB: UBConfig;
}

export const DEFAULT_CONFIG: RuntimeConfig = {
  memory: {
    stack: {
      baseAddress: 1e6,
      size: 5e5,
    },
    heap: {
      baseAddress: 2e6,
      size: 5e5,
    },
    data: {
      baseAddress: 3e6,
      size: 5e5,
    },
    text: {
      baseAddress: 4e6,
      size: 5e5,
    },
  },
  endianness: "little",
  UB: {
    skipStrictAliasingCheck: false,
  },
};
