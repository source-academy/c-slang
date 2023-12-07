import wasmModuleImports from "~src/translator/wasmModuleImports";
import {
  compile as originalCompile,
  compileToWat as originalCompileToWat,
  generate_C_AST,
  generate_WAT_AST as originalGenerate_WAT_AST,
  generate_processed_C_AST,
} from "./compiler";

export {
  generate_C_AST,
  generate_processed_C_AST,
};

// default print to stdout is to console.log
let print = (str: string) => console.log(str);

// set the print function to use for printing to stdout
export function setPrintFunction(printFunc: (str: string) => void) {
  print = printFunc;
}

export function runWasm(wasm: Uint8Array, initialMemory: number) {
  const memory = new WebAssembly.Memory({
    initial: initialMemory
  })
  const moduleImports = {
    print_int: (addr: number) => {
      const intArr = new Int32Array(memory.buffer, addr, 1);  // view of the 1 integer in memory
      print(intArr[0].toString());
    },
  };
  WebAssembly.instantiate(wasm, { imports: moduleImports, js: { mem: memory } });
}

/**
 * Compiles with standard imported functons.
 */
export async function compile(program: string) {
  const { wasm } = await originalCompile(program, wasmModuleImports);
  return wasm;
}

export function compileToWat(program: string) {
  return originalCompileToWat(program, wasmModuleImports);
}

export function generate_WAT_AST(program: string) {
  return originalGenerate_WAT_AST(program, wasmModuleImports);
}

/**
 * Compiles the given C program, including all default imported functions.
 */
export async function compileAndRun(program: string) {
  const { wasm, initialMemory } = await originalCompile(program, wasmModuleImports);
  runWasm(wasm, initialMemory);
}

