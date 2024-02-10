// all functions have the the same type (no params, no return) due to the memory model
export interface WasmFunctionTable {
  elements: WasmFunctionTableEntry[]; // functions in the table
  size: number; // size of the table - undefined functions may contribute to this size
}

export interface WasmFunctionTableEntry {
  functionName: string; // label of the functions
  index: number;
}
