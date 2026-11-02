import { WASM_ADDR_SIZE } from "~src/common/constants";
import { SharedWasmGlobalVariables } from "~src/modules";

/**
 * Manually generates a WebAssembly binary for a function with the given signature.
 * This creates a minimal module that imports a function with the specified signature
 * and re-exports it.
 * 
 * @param paramTypes Array of parameter types ("i32", "i64", "f32", "f64")
 * @param resultType Return type or null for void ("i32", "i64", "f32", "f64", null)
 * @returns Base64 encoded WebAssembly binary
 */
function generateWasmBinary(paramTypes: string[], resultType: string | null): string {
  // WebAssembly binary format constants
  const WASM_BINARY_MAGIC = [0x00, 0x61, 0x73, 0x6D]; // \0asm
  const WASM_BINARY_VERSION = [0x01, 0x00, 0x00, 0x00]; // version 1
  
  // Section IDs
  const TYPE_SECTION_ID = 0x01;
  const IMPORT_SECTION_ID = 0x02;
  const FUNCTION_SECTION_ID = 0x03;
  const EXPORT_SECTION_ID = 0x07;
  
  // Value types
  const TYPE_MAP: Record<string, number> = {
    "i32": 0x7F,
    "i64": 0x7E,
    "f32": 0x7D,
    "f64": 0x7C,
  };
  
  // Function type form
  const FUNC_TYPE_FORM = 0x60;
  
  // Create binary array
  let binary: number[] = [
    ...WASM_BINARY_MAGIC,
    ...WASM_BINARY_VERSION
  ];
  
  // TYPE SECTION - Define function signature
  const typeSection: number[] = [
    TYPE_SECTION_ID, // section ID
    0x00, // section size placeholder
    0x01, // number of types
    FUNC_TYPE_FORM, // function type
    paramTypes.length, // number of parameters
  ];
  
  // Add parameter types
  for (const param of paramTypes) {
    typeSection.push(TYPE_MAP[param]);
  }
  
  // Add result type
  if (resultType === null) {
    typeSection.push(0x00); // no results
  } else {
    typeSection.push(0x01); // one result
    typeSection.push(TYPE_MAP[resultType]);
  }
  
  // Fix type section size
  typeSection[1] = typeSection.length - 2; // -2 for the section ID and size bytes
  
  // IMPORT SECTION - Import the function from module "m", name "f"
  const importSection: number[] = [
    IMPORT_SECTION_ID, // section ID
    0x00, // section size placeholder
    0x01, // number of imports
    0x01, // length of module name
    0x6D, // "m"
    0x01, // length of field name
    0x66, // "f"
    0x00, // import kind (function)
    0x00, // function type index
  ];
  
  // Fix import section size
  importSection[1] = importSection.length - 2; // -2 for the section ID and size bytes
  
  // FUNCTION SECTION - (Empty for this simple case)
  
  // EXPORT SECTION - Export the imported function as "f"
  const exportSection: number[] = [
    EXPORT_SECTION_ID, // section ID
    0x00, // section size placeholder
    0x01, // number of exports
    0x01, // length of export name
    0x66, // "f"
    0x00, // export kind (function)
    0x00, // function index
  ];
  
  // Fix export section size
  exportSection[1] = exportSection.length - 2; // -2 for the section ID and size bytes
  
  // Combine all sections
  binary = [
    ...binary,
    ...typeSection,
    ...importSection,
    ...exportSection
  ];
  
  return btoa(String.fromCharCode(...binary));
}

/**
 * Adds a JavaScript function with custom parameter and return types to the WebAssembly function table.
 * 
 * @param jsFunction JavaScript function to add to the table
 * @param paramTypes Array of parameter types (e.g., ["f64", "i32"])
 * @param resultType Return type or null for void 
 * @param functionTable The WebAssembly function table
 * @param memory WebAssembly memory
 * @param sharedWasmGlobalVariables Global variables for stack/base pointers
 * @returns Index of the function in the table
 */
export function addCustomJsFunctionToTable(
    jsFunction: (...args: any[]) => any,
    paramTypes: string[],
    resultType: string | null,
    functionTable: WebAssembly.Table,
    memory: WebAssembly.Memory,
    sharedWasmGlobalVariables: SharedWasmGlobalVariables
  ): number {
    // Create wrapper that reads parameters from memory based on types
    const stackWrapperFunc = (...dummyArgs: any[]) => {
      // Read parameters from stack - in reverse order to match WebAssembly calling convention
      const args: any[] = [];
      const reversedParamTypes = [...paramTypes].reverse(); // Create a reversed copy
      
      // Calculate starting offset
      let currentOffset = sharedWasmGlobalVariables.stackPointer.value;
      
      // First determine the total size needed for all parameters to find starting point
      // of the last parameter (which is first in WebAssembly stack)
      let totalSize = 0;
      for (const paramType of paramTypes) {
        switch (paramType) {
          case "i32":
          case "f32":
            totalSize += 4;
            break;
          case "i64":
          case "f64":
            totalSize += 8;
            break;
        }
      }
      
      let readOffset = currentOffset;
      
      // Read parameters in reverse order and build args array in correct order
      const tempArgs: any[] = [];
      
      for (const paramType of reversedParamTypes) {
        const dataView = new DataView(memory.buffer, readOffset);
        let value: any;
        
        switch (paramType) {
          case "i32":
            value = dataView.getInt32(0, true);
            readOffset += 4;
            break;
          case "i64":
            value = dataView.getBigInt64(0, true);
            readOffset += 8;
            break;
          case "f32":
            value = dataView.getFloat32(0, true);
            readOffset += 4;
            break;
          case "f64":
            value = dataView.getFloat64(0, true);
            readOffset += 8;
            break;
        }
        
        tempArgs.push(value);
      }
      
      // Reverse thordere collected arguments to get them in the original 
      args.push(...tempArgs.reverse());
      
      const result = jsFunction(...args);
      
      // Write result to memory if needed
      if (resultType !== null) {
        const returnOffset = sharedWasmGlobalVariables.basePointer.value + WASM_ADDR_SIZE;
        const returnView = new DataView(memory.buffer, returnOffset);
        
        switch (resultType) {
          case "i32":
            returnView.setInt32(0, Number(result), true);
            break;
          case "i64":
            returnView.setBigInt64(0, BigInt(result), true);
            break;
          case "f32":
            returnView.setFloat32(0, Number(result), true);
            break;
          case "f64":
            returnView.setFloat64(0, Number(result), true);
            break;
        }
      }
      
      return 0;
    };
    
    const base64BinaryString = generateWasmBinary(paramTypes, resultType);
    
    try {
      const binary = new Uint8Array(atob(base64BinaryString).split("").map((c) => c.charCodeAt(0)));
      
      const instance = new WebAssembly.Instance(new WebAssembly.Module(binary), {
        m: { f: stackWrapperFunc }
      });
      
      const wasmFunction = instance.exports.f;
      
      const newFuncPtr = functionTable.length;
      functionTable.grow(1);
      functionTable.set(newFuncPtr, wasmFunction);
      
      return newFuncPtr;
    } catch (e) {
      console.error("Error adding custom function to WebAssembly table:", e);
      throw e;
    }
  }