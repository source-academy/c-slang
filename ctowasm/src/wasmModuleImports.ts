/**
 *  Definitions of all special functions imported to every wasm program
 */

import BigNumber from "bignumber.js";
import { FunctionDataType } from "~src/parser/c-ast/dataTypes";

const defaultParentImportedObject = "imports";

// Defines the signature of a wasm imported function
export interface ImportedFunction {
  parentImportedObject: string; // parent imported object
  functionType: FunctionDataType;
  // eslint-disable-next-line
  jsFunction: Function; // the actual JS function that is called
}

// default print to stdout is to console.log
let print = (str: string) => console.log(str);

// set the print function to use for printing to stdout
export function setPrintFunction(printFunc: (str: string) => void) {
  print = printFunc;
}

export const wasmModuleImports: Record<string, ImportedFunction> = {
  // prints a signed int (4 bytes and smaller)
  print_int: {
    parentImportedObject: defaultParentImportedObject,
    functionType: {
      type: "function",
      parameters: [
        {
          type: "primary",
          primaryDataType: "signed int",
        },
      ],
      returnType: null,
    },
    jsFunction: (int: number) => {
      // to print the correct int (4 bytes), need to handle signage
      if (int > Math.pow(2, 32) - 1) {
        // negative number
        print((-int).toString());
      } else {
        print(int.toString());
      }
    },
  },
  // prints an unsigned int (4 bytes and smaller)
  print_int_unsigned: {
    parentImportedObject: defaultParentImportedObject,
    functionType: {
      type: "function",
      parameters: [
        {
          type: "primary",
          primaryDataType: "unsigned int",
        },
      ],
      returnType: null,
    },
    jsFunction: (val: number) => {
      // need to intepret val as unsigned 4 byte int
      if (val < 0) {
        print((val + Math.pow(2, 32)).toString());
      } else {
        print(val.toString());
      }
    },
  },
  // prints a char (signed) as a character
  print_char: {
    parentImportedObject: defaultParentImportedObject,
    functionType: {
      type: "function",
      parameters: [
        {
          type: "primary",
          primaryDataType: "signed char",
        },
      ],
      returnType: null,
    },
    jsFunction: (char: number) => {
      // signed int overflow is undefined, no need to worry about handling that
      print(String.fromCharCode(char));
    },
  },
  // print a signed long type (8 bytes)
  print_long: {
    parentImportedObject: defaultParentImportedObject,
    functionType: {
      type: "function",
      parameters: [
        {
          type: "primary",
          primaryDataType: "signed long",
        },
      ],
      returnType: null,
    },
    jsFunction: (long: bigint) => {
      // to prlong the correct long (4 bytes), need to handle signage
      if (long > 2n ** 64n - 1n) {
        // negative number
        print((-long).toString());
      } else {
        print(long.toString());
      }
    },
  },
  // print an usigned long type (8 bytes)
  print_long_unsigned: {
    parentImportedObject: defaultParentImportedObject,
    functionType: {
      type: "function",
      parameters: [
        {
          type: "primary",
          primaryDataType: "unsigned long",
        },
      ],
      returnType: null,
    },
    jsFunction: (val: bigint) => {
      // need to intepret val as unsigned 8 byte unsigned int
      if (val < 0) {
        print((val + 2n ** 64n).toString());
      } else {
        print(val.toString());
      }
    },
  },
  print_float: {
    parentImportedObject: defaultParentImportedObject,
    functionType: {
      type: "function",
      parameters: [
        {
          type: "primary",
          primaryDataType: "float",
        },
      ],
      returnType: null,
    },
    jsFunction: printFloatCStyle,
  },
  print_double: {
    parentImportedObject: defaultParentImportedObject,
    functionType: {
      type: "function",
      parameters: [
        {
          type: "primary",
          primaryDataType: "double",
        },
      ],
      returnType: null,
    },
    jsFunction: printFloatCStyle,
  },
  // for printing the value of pointers. behaves the same as print_int_unsigned
  print_address: {
    parentImportedObject: defaultParentImportedObject,
    functionType: {
      type: "function",
      parameters: [
        {
          type: "primary",
          primaryDataType: "unsigned int",
        },
      ],
      returnType: null,
    },
    jsFunction: (val: number) => {
      // need to intepret val as unsigned 4 byte int
      if (val < 0) {
        print((val + Math.pow(2, 32)).toString());
      } else {
        print(val.toString());
      }
    },
  },
};

// used to extract the details of imported functions in terms of C -> to be used by compiler
export function extractImportedFunctionCDetails(
  wasmModuleImports: Record<string, ImportedFunction>
) {
  const importedFunctionCDetails: Record<string, FunctionDataType> = {};
  Object.keys(wasmModuleImports).forEach((importedFuncName) => {
    importedFunctionCDetails[importedFuncName] =
      wasmModuleImports[importedFuncName].functionType;
  });
  return importedFunctionCDetails;
}

/**
 * Function for printing float in the c style ("%f" format specifier) - 6 decimal places.
 */
function printFloatCStyle(float: number) {
  if (float === Infinity) {
    print("inf");
    return;
  } else if (float === -Infinity) {
    print("-inf");
    return;
  }

  let floatStr = float.toString(16);
  if (floatStr[0] === "-") {
    floatStr = "-0x" + floatStr.slice(1, floatStr.length);
  } else {
    floatStr = "0x" + floatStr;
  }
  const bigNumber = new BigNumber(floatStr);
  print(bigNumber.toFixed(6));
}

export default wasmModuleImports;
