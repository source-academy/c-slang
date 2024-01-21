/**
 * Defiinition of various utility functions relating to manaaging Wasm data types.
 */

import { PrimaryCDataType, ScalarCDataType } from "~src/common/types";
import { isUnsignedIntegerType, isSignedIntegerType } from "~src/common/utils";
import { TranslationError } from "~src/errors";
import { ConstantP } from "~src/processor/c-ast/expression/constants";
import { WASM_ADDR_TYPE } from "~src/translator/memoryUtil";
import { WasmConst } from "~src/translator/wasm-ast/consts";
import { WasmExpression } from "~src/translator/wasm-ast/core";
import {
  WasmDataType,
  WasmFloatType,
  WasmIntType,
} from "~src/translator/wasm-ast/dataTypes";
import { NumericConversionInstruction } from "./wasm-ast/numericConversion";

/**
 * Mapping of C variable types to the Wasm variable type used to perform operations on it.
 */

export const priamryCDataTypeToWasmType: Record<
  PrimaryCDataType,
  WasmDataType
> = {
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
  scalarType: ScalarCDataType,
): WasmDataType {
  if (scalarType === "pointer") {
    return WASM_ADDR_TYPE;
  } else {
    return priamryCDataTypeToWasmType[scalarType];
  }
}
function getNeededNumericConversionInstruction(
  from: WasmDataType,
  to: WasmDataType,
  signage: "unsigned" | "signed",
): NumericConversionInstruction {
  if (from === "i32" && to === "i64") {
    if (typeof signage === "undefined") {
      throw new TranslationError(
        "Missing sign information for numeric conversion from i32 to i64",
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
        "Missing sign information for numeric conversion from i32 to f32",
      );
    } else if (signage === "signed") {
      return "f32.convert_i32_s";
    } else {
      return "f32.convert_i32_u";
    }
  } else if (from === "i64" && to === "f32") {
    if (typeof signage === "undefined") {
      throw new TranslationError(
        "Missing sign information for numeric conversion from i64 to f32",
      );
    } else if (signage === "signed") {
      return "f32.convert_i64_s";
    } else {
      return "f32.convert_i64_u";
    }
  } else if (from === "i32" && to === "f64") {
    if (typeof signage === "undefined") {
      throw new TranslationError(
        "Missing sign information for numeric conversion from i32 to f64",
      );
    } else if (signage === "signed") {
      return "f64.convert_i32_s";
    } else {
      return "f64.convert_i32_u";
    }
  } else if (from === "i64" && to === "f64") {
    if (typeof signage === "undefined") {
      throw new TranslationError(
        "Missing sign information for numeric conversion from i64 to f64",
      );
    } else if (signage === "signed") {
      return "f64.convert_i64_s";
    } else {
      return "f64.convert_i64_u";
    }
  } else if (from === "f32" && to === "i32") {
    if (typeof signage === "undefined") {
      throw new TranslationError(
        "Missing sign information for numeric conversion from f32 to i32",
      );
    } else if (signage === "signed") {
      return "i32.trunc_f32_s";
    } else {
      return "i32.trunc_f32_u";
    }
  } else if (from === "f64" && to === "i32") {
    if (typeof signage === "undefined") {
      throw new TranslationError(
        "Missing sign information for numeric conversion from f64 to i32",
      );
    } else if (signage === "signed") {
      return "i32.trunc_f64_s";
    } else {
      return "i32.trunc_f64_u";
    }
  } else if (from === "f32" && to === "i64") {
    if (typeof signage === "undefined") {
      throw new TranslationError(
        "Missing sign information for numeric conversion from f32 to i64",
      );
    } else if (signage === "signed") {
      return "i64.trunc_f32_s";
    } else {
      return "i64.trunc_f32_u";
    }
  } else if (from === "f64" && to === "i64") {
    if (typeof signage === "undefined") {
      throw new TranslationError(
        "Missing sign information for numeric conversion from f64 to i64",
      );
    } else if (signage === "signed") {
      return "i64.trunc_f64_s";
    } else {
      return "i64.trunc_f64_u";
    }
  } else {
    // should not happen
    throw new TranslationError(
      `Unhandled numeric conversion between wasm types: ${from} to ${to}`,
    );
  }
}
/**
 * Get the WAT AST NumericWrapper node that converts a primary C data type "from" to another type "to".
 */
export function getTypeConversionWrapper(
  from: ScalarCDataType, // the C variable type of value being assigned
  to: ScalarCDataType, // the C variable type of variable being assigned to
  translatedExpression: WasmExpression, // the translated expression being assiged to the variable
): WasmExpression {
  const fromWasmType = convertScalarDataTypeToWasmType(from);
  const toWasmType = convertScalarDataTypeToWasmType(to);

  // sanity checks
  if (typeof toWasmType === "undefined") {
    throw new TranslationError(
      `getTypeConversionWrapper: undefined variableWasmType: original type: ${to}`,
    );
  }
  if (typeof fromWasmType === "undefined") {
    throw new TranslationError(
      `getTypeConversionWrapper: undefined valueWasmType: original type: ${from}`,
    );
  }

  if (toWasmType === fromWasmType) {
    // same wasm type already. no need any numeric conversion, and C implicit conversion rules will be adhered to
    return translatedExpression;
  }

  if (isUnsignedIntegerType(from) || from === "pointer") {
    return {
      type: "NumericWrapper",
      instruction: getNeededNumericConversionInstruction(
        fromWasmType,
        toWasmType,
        "unsigned",
      ),
      expr: translatedExpression,
    };
  } else if (isSignedIntegerType(from)) {
    return {
      type: "NumericWrapper",
      instruction: getNeededNumericConversionInstruction(
        fromWasmType,
        toWasmType,
        "signed",
      ),
      expr: translatedExpression,
    };
  } else {
    // for float types, conversion should be signed
    return {
      type: "NumericWrapper",
      instruction: getNeededNumericConversionInstruction(
        fromWasmType,
        toWasmType,
        "signed",
      ),
      expr: translatedExpression,
    };
  }
}

/**
 * Converts a constant to a Wasm const.
 */
export function convertConstantToWasmConst(constant: ConstantP): WasmConst {
  if (constant.type === "IntegerConstant") {
    return {
      type: "IntegerConst",
      wasmDataType: priamryCDataTypeToWasmType[
        constant.dataType
      ] as WasmIntType,
      value: constant.value,
    };
  } else {
    return {
      type: "FloatConst",
      wasmDataType: priamryCDataTypeToWasmType[
        constant.dataType
      ] as WasmFloatType,
      value: constant.value,
    };
  }
}
