import "emscripten";
interface UtilityEmscriptenModule extends EmscriptenModule {
  cwrap: typeof cwrap;
  stringToNewUTF8: (str: string) => number;
  _free: (ptr: number) => void;
  _atof: (x: number) => number;
  _atoi: (x: number) => number;
  _atol: (x: number) => bigint;
  _abs: (x: number) => number;
  _labs: (x: bigint) => bigint;
  _rand: () => number;
  _srand: (x: number) => void; 
  _qsort: (ptr: number, numElements: number, sizeOfElement: number, fnPtr: (aPtr: number, bPtr: number) => number) => void; 
}

export default function utilityEmscriptenModuleFactoryFn(): Promise<UtilityEmscriptenModule>;
