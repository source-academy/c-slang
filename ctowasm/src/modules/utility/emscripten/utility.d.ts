import "emscripten";
interface UtilityEmscriptenModule extends EmscriptenModule {
  // exported functions
  cwrap: typeof cwrap;
  stringToNewUTF8: (str: string) => number;
  addFunction: typeof addFunction;
  _malloc: (size: number) => number;
  _free: (ptr: number) => void;
  _atof: (x: number) => number;
  _atoi: (x: number) => number;
  _atol: (x: number) => bigint;
  _abs: (x: number) => number;
  _labs: (x: bigint) => bigint;
  _rand: () => number;
  _srand: (x: number) => void;
  _qsort: (
    ptr: number,
    count: number,
    size: number,
    fnPtr: (aPtr: number, bPtr: number) => number,
  ) => void;

  // memory of the emscripten module
  wasmMemory: WebAssembly.Memory;
}

export default function utilityEmscriptenModuleFactoryFn(): Promise<UtilityEmscriptenModule>;
