import BigNumber from "bignumber.js";

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
