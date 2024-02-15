import BigNumber from "bignumber.js";
import { ModulesGlobalConfig } from "~src/modules";

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
export function extractCStyleStringFromMemory(buffer: ArrayBuffer, strAddress: number) {
  const uInt8Arr = new Uint8Array(buffer);
  let str = "";
  let i = strAddress;
  while (uInt8Arr[i] !== 0) {
    // keep recording chars until null terminator
    str += String.fromCharCode(uInt8Arr[i++]);
  }
  return str;
}

export function getExternalFunction(funcName: string, config: ModulesGlobalConfig): Function {
  if (!config.externalFunctions || !(funcName in config.externalFunctions)) {
    throw Error(`External function ${funcName} not provided in compiler configs`);
  }
  return config.externalFunctions[funcName];
}
