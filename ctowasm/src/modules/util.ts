import BigNumber from "bignumber.js";
import { calculateNumberOfPagesNeededForBytes } from "~src/common/utils";
import { ModulesGlobalConfig, SharedWasmGlobalVariables } from "~src/modules";
import {mallocFunction} from "~src/modules/source_stdlib/memory";

// export function extractImportedFunctionCDetails(
//   wasmModuleImports: Record<string, ImportedFunction>
// ) {
//   const importedFunctionCDetails: Record<string, FunctionDataType> = {};
//   Object.keys(wasmModuleImports).forEach((importedFuncName) => {
//     importedFunctionCDetails[importedFuncName] =
//       wasmModuleImports[importedFuncName].functionType;
//   });
//   return importedFunctionCDetails;
// }

/**
 * Function for converting a float to the c style ("%f" format specifier) - 6 decimal places.
 */
export function convertFloatToCStyleString(float: number): string {
  if (float === Infinity) {
    return "inf";
  } else if (float === -Infinity) {
    return "-inf";
  }

  let floatStr = float.toString(16);
  if (floatStr[0] === "-") {
    floatStr = "-0x" + floatStr.slice(1, floatStr.length);
  } else {
    floatStr = "0x" + floatStr;
  }
  const bigNumber = new BigNumber(floatStr);
  return bigNumber.toFixed(6);
}

/**
 * Extracts a C-style string from memory buffer, starting at given address.
 */
export function extractCStyleStringFromMemory(
  buffer: ArrayBuffer,
  strAddress: number,
) {
  const uInt8Arr = new Uint8Array(buffer);
  let str = "";
  let i = strAddress;
  while (uInt8Arr[i] !== 0) {
    // keep recording chars until null terminator
    str += String.fromCharCode(uInt8Arr[i++]);
  }
  return str;
}

export function getExternalFunction(
  funcName: string,
  config: ModulesGlobalConfig,
): Function {
  if (!config.externalFunctions || !(funcName in config.externalFunctions)) {
    throw Error(
      `External function ${funcName} not provided in compiler configs`,
    );
  }
  return config.externalFunctions[funcName];
}

export function checkAndExpandMemoryIfNeeded(
  memory: WebAssembly.Memory,
  bytesRequested: number,
  sharedWasmGlobalVariables: SharedWasmGlobalVariables,
) {
  const stackPointer = sharedWasmGlobalVariables.stackPointer;
  const heapPointer = sharedWasmGlobalVariables.heapPointer;
  const basePointer = sharedWasmGlobalVariables.basePointer;
  const freeSpace = stackPointer.value - heapPointer.value;
  if (freeSpace < bytesRequested) {
    // need to grow memory
    const additionalPagesNeeded = calculateNumberOfPagesNeededForBytes(
      bytesRequested - freeSpace,
    );
    const stackSegmentSize = memory.buffer.byteLength - stackPointer.value;
    const oldMemorySize = memory.buffer.byteLength;
    memory.grow(additionalPagesNeeded);
    // need to copy stack segment starting from the end of the new memory buffer
    const memoryView = new Uint8Array(memory.buffer);
    for (let i = 0; i < stackSegmentSize; i++) {
      memoryView[memoryView.length - i - 1] = memoryView[oldMemorySize - i - 1];
    }
    // set base pointer
    const bpOffsetFromSp = basePointer.value - stackPointer.value;
    // set stack pointer
    stackPointer.value = memoryView.length - stackSegmentSize;
    // set base pointer
    basePointer.value = stackPointer.value + bpOffsetFromSp;
  }
}

export function printSharedGlobalVariables(
  sharedWasmGlobalVariables: SharedWasmGlobalVariables,
) {
  for (const [name, value] of Object.entries(sharedWasmGlobalVariables)) {
    console.log(`${name}: ${value.value}`);
  }
}

export function storeObjectInMemory(
    memory: WebAssembly.Memory,
    objectReferenceRegistry: Map<string, Object>,
    sharedWasmGlobalVariables: SharedWasmGlobalVariables,
    allocatedBlocks: Map<number, number>,
    freeList: any[],
    obj: Object,
) {
    const uniqueString = crypto.randomUUID();
    objectReferenceRegistry.set(uniqueString, obj);
    const mapStringBuffer = stringToBuffer(uniqueString);
    const objSize = mapStringBuffer.length;
    const address = mallocFunction(
        {
            memory: memory,
            sharedWasmGlobalVariables: sharedWasmGlobalVariables,
            bytesRequested: objSize,
            allocatedBlocks,
            freeList
        }
    )
    const objArr = new Uint8Array(memory.buffer, address, objSize);
    for (let i = 0; i < objSize; i++) {
        objArr[i] = mapStringBuffer[i];
    }
    return address;
}

export function loadObjectFromMemory(
    memory: WebAssembly.Memory,
    objectReferenceRegistry: Map<string, Object>,
    allocatedBlocks: Map<number, number>,
    address: number,
): Object {
    const objArr = new Uint8Array(memory.buffer, address, allocatedBlocks.get(address));
    const mapKeySt = bufferToString(objArr);
    const result = objectReferenceRegistry.get(mapKeySt);
    console.log(mapKeySt, memory.buffer);
    if (!result) {
        throw Error("Object not found");
    }
    return result;
}


function stringToBuffer(st: string): Uint8Array {
    const encoder = new TextEncoder();
    return encoder.encode(st);
}

function bufferToString(buffer: Uint8Array): string {
    const decoder = new TextDecoder();
    return decoder.decode(buffer);
}