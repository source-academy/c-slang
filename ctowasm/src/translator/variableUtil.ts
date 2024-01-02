/**
 * This file contains utility functions related to variables.
 */

import { Expression } from "~src/c-ast/core";
import { ArrayElementExpr, VariableExpr } from "~src/c-ast/variable";
import {
  PrimaryCDataType,
  PrimaryDataType,
  DataType,
  ScalarDataType,
} from "~src/common/types";
import { TranslationError } from "~src/errors";
import translateExpression from "~src/translator/translateExpression";
import {
  BASE_POINTER,
  WASM_ADDR_ADD_INSTRUCTION,
  WASM_ADDR_CTYPE,
  WASM_ADDR_MUL_INSTRUCTION,
  WASM_ADDR_SUB_INSTRUCTION,
  WASM_ADDR_TYPE,
} from "~src/translator/memoryUtil";
import { WasmFloatType, WasmIntType, WasmType } from "~src/wasm-ast/types";
import { WasmModule, WasmExpression } from "~src/wasm-ast/core";
import { WasmSymbolTable } from "./symbolTable";
import { MemoryVariableByteSize } from "~src/wasm-ast/memory";
import { Constant } from "~src/c-ast/constants";
import { wasmTypeToSize } from "~src/translator/util";
import {
  getDataTypeSize,
  isSignedIntegerType,
  isUnsignedIntegerType,
} from "~src/common/utils";
import {
  NumericConversionInstruction,
  WasmNumericConversionWrapper,
} from "~src/wasm-ast/misc";
import { WasmBinaryExpression } from "~src/wasm-ast/expressions";
import { WasmConst, WasmIntegerConst } from "~src/wasm-ast/consts";
import { WASM_ADDR_SIZE } from "~src/common/constants";
import { retrieveVariableFromSymbolTable } from "./symbolTable";

/**
 * Mapping of C variable types to the Wasm variable type used to perform operations on it.
 */
export const primaryCDataTypeToWasmType: Record<PrimaryCDataType, WasmType> = {
  ["unsigned char"]: "i32",
  ["signed char"]: "i32",
  ["unsigned short"]: "i32",
  ["signed short"]: "i32",
  ["unsigned int"]: "i32",
  ["signed int"]: "i32",
  ["unsigned long"]: "i64",
  ["signed long"]: "i64",
  ["float"]: "f32",
  ["double"]: "f64",
};

/**
 * Converts a scalar type to a primary data type
 */
export function convertScalarDataTypeToWasmType(
  scalarType: ScalarDataType
): WasmType {
  if (scalarType.type === "pointer") {
    return WASM_ADDR_TYPE;
  } else {
    return primaryCDataTypeToWasmType[scalarType.primaryDataType];
  }
}

/**
 * Converts a constant to a Wasm const.
 */
export function convertConstantToWasmConst(constant: Constant): WasmConst {
  if (constant.type === "IntegerConstant") {
    return {
      type: "IntegerConst",
      wasmDataType: primaryCDataTypeToWasmType[
        constant.dataType.primaryDataType
      ] as WasmIntType,
      value: constant.value,
    };
  } else {
    return {
      type: "FloatConst",
      wasmDataType: primaryCDataTypeToWasmType[
        constant.dataType.primaryDataType
      ] as WasmFloatType,
      value: constant.value,
    };
  }
}

/**
 * Returns the ast nodes that equal to the address to use for memory instructions for a variable,
 * depending on whether it is a local or global variable.
 */
export function getVariableAddr(
  symbolTable: WasmSymbolTable,
  variableName: string
): WasmExpression {
  const variable = retrieveVariableFromSymbolTable(symbolTable, variableName);
  if (variable.type === "GlobalMemoryVariable") {
    // this is a global variable
    return {
      type: "IntegerConst",
      wasmDataType: WASM_ADDR_TYPE,
      value: BigInt(variable.offset),
    };
  } else {
    // local variable
    return {
      type: "BinaryExpression",
      instruction: WASM_ADDR_SUB_INSTRUCTION,
      leftExpr: {
        type: "GlobalGet",
        name: BASE_POINTER,
      },
      rightExpr: {
        type: "IntegerConst",
        wasmDataType: WASM_ADDR_TYPE,
        value: BigInt(variable.offset),
      },
    };
  }
}

/**
 * Returns the ast nodes that equal to the address to use for memory instructions for a array variable.
 */
export function getArrayElementAddr(
  wasmRoot: WasmModule,
  symbolTable: WasmSymbolTable,
  arrayName: string,
  elementIndex: Expression,
  elementSize: number
) {
  return {
    type: "BinaryExpression",
    wasmDataType: WASM_ADDR_TYPE,
    instruction: WASM_ADDR_ADD_INSTRUCTION,
    leftExpr: getVariableAddr(symbolTable, arrayName),
    // may need a numeric wrapper on the expression used to index the array to make sure it is unsigned int
    rightExpr: getTypeConversionWrapper(
      // make sure the resultant expression is same type as WASM_ADDR_CTYPE
      elementIndex.dataType as PrimaryDataType, // expression must be integral type,
      WASM_ADDR_CTYPE,
      {
        type: "BinaryExpression",
        instruction: WASM_ADDR_MUL_INSTRUCTION,
        leftExpr: translateExpression(wasmRoot, symbolTable, elementIndex),
        rightExpr: {
          type: "IntegerConst",
          wasmDataType: WASM_ADDR_TYPE,
          value: BigInt(elementSize),
        },
      }
    ),
  };
}

/**
 * Returns the ast nodes that equal to the address to use for memory instructions for a array variable given a constant number as index.
 */
export function getArrayConstantIndexElementAddr(
  symbolTable: WasmSymbolTable,
  arrayName: string,
  elementIndex: number,
  elementSize: number
): WasmBinaryExpression {
  return {
    type: "BinaryExpression",
    instruction: WASM_ADDR_ADD_INSTRUCTION,
    leftExpr: getVariableAddr(symbolTable, arrayName),
    rightExpr: {
      type: "IntegerConst",
      wasmDataType: WASM_ADDR_TYPE,
      value: BigInt(elementIndex * elementSize),
    },
  };
}

/**
 * Retrieves the numeric conversion instruction needed to convert WasmType "from" to "to".
 * Some operations require knowledge of the sign of the original C "from" variable to get the right instruction.
 */
function getNeededNumericConversionInstruction(
  from: WasmType,
  to: WasmType,
  signage: "unsigned" | "signed"
): NumericConversionInstruction {
  if (from === "i32" && to === "i64") {
    if (typeof signage === "undefined") {
      throw new TranslationError(
        "Missing sign information for numeric conversion from i32 to i64"
      );
    } else if (signage === "signed") {
      return "i64.extend_i32_s";
    } else {
      return "i64.extend_i32_u";
    }
  } else if (from === "i64" && to === "i32") {
    return "i32.wrap_i64";
  } else if (from === "f32" && to === "f64") {
    return "f64.promote_f32";
  } else if (from === "f64" && to === "f32") {
    return "f32.demote_f64";
  } else if (from === "i32" && to === "f32") {
    if (typeof signage === "undefined") {
      throw new TranslationError(
        "Missing sign information for numeric conversion from i32 to f32"
      );
    } else if (signage === "signed") {
      return "f32.convert_i32_s";
    } else {
      return "f32.convert_i32_u";
    }
  } else if (from === "i64" && to === "f32") {
    if (typeof signage === "undefined") {
      throw new TranslationError(
        "Missing sign information for numeric conversion from i64 to f32"
      );
    } else if (signage === "signed") {
      return "f32.convert_i64_s";
    } else {
      return "f32.convert_i64_u";
    }
  } else if (from === "i32" && to === "f64") {
    if (typeof signage === "undefined") {
      throw new TranslationError(
        "Missing sign information for numeric conversion from i32 to f64"
      );
    } else if (signage === "signed") {
      return "f64.convert_i32_s";
    } else {
      return "f64.convert_i32_u";
    }
  } else if (from === "i64" && to === "f64") {
    if (typeof signage === "undefined") {
      throw new TranslationError(
        "Missing sign information for numeric conversion from i64 to f64"
      );
    } else if (signage === "signed") {
      return "f64.convert_i64_s";
    } else {
      return "f64.convert_i64_u";
    }
  } else if (from === "f32" && to === "i32") {
    if (typeof signage === "undefined") {
      throw new TranslationError(
        "Missing sign information for numeric conversion from f32 to i32"
      );
    } else if (signage === "signed") {
      return "i32.trunc_f32_s";
    } else {
      return "i32.trunc_f32_u";
    }
  } else if (from === "f64" && to === "i32") {
    if (typeof signage === "undefined") {
      throw new TranslationError(
        "Missing sign information for numeric conversion from f64 to i32"
      );
    } else if (signage === "signed") {
      return "i32.trunc_f64_s";
    } else {
      return "i32.trunc_f64_u";
    }
  } else if (from === "f32" && to === "i64") {
    if (typeof signage === "undefined") {
      throw new TranslationError(
        "Missing sign information for numeric conversion from f32 to i64"
      );
    } else if (signage === "signed") {
      return "i64.trunc_f32_s";
    } else {
      return "i64.trunc_f32_u";
    }
  } else if (from === "f64" && to === "i64") {
    if (typeof signage === "undefined") {
      throw new TranslationError(
        "Missing sign information for numeric conversion from f64 to i64"
      );
    } else if (signage === "signed") {
      return "i64.trunc_f64_s";
    } else {
      return "i64.trunc_f64_u";
    }
  } else {
    // should not happen
    throw new TranslationError(
      `Unhandled numeric conversion between wasm types: ${from} to ${to}`
    );
  }
}

/**
 * Get the WAT AST NumericWrapper node that converts a primary C data type "from" to another type "to".
 */
export function getTypeConversionWrapper(
  from: ScalarDataType, // the C variable type of value being assigned
  to: ScalarDataType, // the C variable type of variable being assigned to
  translatedExpression: WasmExpression // the translated expression being assiged to the variable
): WasmExpression {
  let fromWasmType: WasmType;
  let toWasmType: WasmType;

  if (from.type === "pointer") {
    fromWasmType = WASM_ADDR_TYPE;
  } else {
    fromWasmType = primaryCDataTypeToWasmType[from.primaryDataType];
  }

  if (to.type === "pointer") {
    toWasmType = WASM_ADDR_TYPE;
  } else {
    toWasmType = primaryCDataTypeToWasmType[to.primaryDataType];
  }

  // sanity checks
  if (typeof toWasmType === "undefined") {
    throw new TranslationError(
      `getTypeConversionWrapper: undefined variableWasmType: original type: ${to}`
    );
  }
  if (typeof fromWasmType === "undefined") {
    throw new TranslationError(
      `getTypeConversionWrapper: undefined valueWasmType: original type: ${from}`
    );
  }

  if (toWasmType === fromWasmType) {
    // same wasm type already. no need any numeric conversion, and C implicit conversion rules will be adhered to
    return translatedExpression;
  }

  if (isUnsignedIntegerType(from) || from.type === "pointer") {
    return {
      type: "NumericWrapper",
      instruction: getNeededNumericConversionInstruction(
        fromWasmType,
        toWasmType,
        "unsigned"
      ),
      wasmDataType: toWasmType,
      expr: translatedExpression,
    } as WasmNumericConversionWrapper;
  } else if (isSignedIntegerType(from)) {
    return {
      type: "NumericWrapper",
      instruction: getNeededNumericConversionInstruction(
        fromWasmType,
        toWasmType,
        "signed"
      ),
      wasmDataType: toWasmType,
      expr: translatedExpression,
    } as WasmNumericConversionWrapper;
  } else {
    // for float types, conversion should be signed
    return {
      type: "NumericWrapper",
      instruction: getNeededNumericConversionInstruction(
        fromWasmType,
        toWasmType,
        "signed"
      ),
      wasmDataType: toWasmType,
      expr: translatedExpression,
    } as WasmNumericConversionWrapper;
  }
}

/**
 * Information on how to load/store a specific primary C data type in wasm memory.
 * A struct or array may be composed of multiple of these.
 */
interface MemoryInformation {
  wasmType: WasmType;
  numOfBytes: MemoryVariableByteSize;
  offset: number; // offset in number of bytes from the start of the variable (e.g. the 2nd element of an array of ints has offset 4)
}

/**
 * Returns all the memory information corresponding to a storing of each primary C data type
 * that a variable is composed of.
 */
export function getMemoryInformation(dataType: DataType): MemoryInformation[] {
  if (dataType.type === "primary") {
    return [
      {
        wasmType: primaryCDataTypeToWasmType[dataType.primaryDataType],
        numOfBytes: getDataTypeSize(dataType) as MemoryVariableByteSize,
        offset: 0,
      },
    ];
  } else if (dataType.type === "pointer") {
    return [
      {
        wasmType: "i32",
        numOfBytes: WASM_ADDR_SIZE,
        offset: 0,
      },
    ];
  } else if (dataType.type === "array") {
    const memoryInfo = [];
    let offset = 0;
    const memoryInfoOfOneElement = getMemoryInformation(
      dataType.elementDataType
    );
    for (let i = 0; i < dataType.numElements; ++i) {
      for (let j = 0; j < memoryInfoOfOneElement.length; ++j) {
        const m = memoryInfoOfOneElement[j];
        memoryInfo.push({
          ...m,
          offset,
        });
        offset += m.numOfBytes;
      }
    }
    return memoryInfo;
  } else if (dataType.type === "struct") {
    // TODO: support when typedef is done
    throw new TranslationError(
      "getMemoryInformation(): typedef not yet supported"
    );
  } else if (dataType.type === "typedef") {
    // TODO: support when typedef is done
    throw new TranslationError(
      "getMemoryInformation(): typedef not yet supported"
    );
  } else {
    throw new TranslationError(
      "getMemoryInformation(): Unhandled variable type."
    );
  }
}
