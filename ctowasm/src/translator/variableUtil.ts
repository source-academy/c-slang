/**
 * This file contains utility functions related to variables.
 */

import { ArrayElementExpr } from "~src/c-ast/arrays";
import { Expression } from "~src/c-ast/core";
import { VariableExpr } from "~src/c-ast/variable";
import { VariableType } from "~src/common/types";
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
import { WasmType } from "~src/wasm-ast/types";
import {
  WasmModule,
  WasmExpression,
} from "~src/wasm-ast/core";
import { WasmSymbolTable } from "~src/wasm-ast/functions";
import {
  WasmLocalArray,
  MemoryVariableByteSize,
  WasmDataSegmentArray,
  WasmLocalVariable,
  WasmDataSegmentVariable,
} from "~src/wasm-ast/memory";
import { Constant } from "~src/c-ast/constants";
import { wasmTypeToSize } from "~src/translator/util";
import { isSignedIntegerType, isUnsignedIntegerType } from "~src/common/utils";
import {
  NumericConversionInstruction,
  WasmNumericConversionWrapper,
} from "~src/wasm-ast/misc";
import { WasmBinaryExpression } from "~src/wasm-ast/binaryExpression";
import { WasmConst, WasmIntegerConst } from "~src/wasm-ast/consts";

/**
 * Mapping of C variable types to the Wasm variable type used to perform operations on it.
 */
export const variableTypeToWasmType: Record<VariableType, WasmType> = {
  ["unsigned char"]: "i32",
  ["signed char"]: "i32",
  ["unsigned short"]: "i32",
  ["signed short"]: "i32",
  ["unsigned int"]: "i32",
  ["signed int"]: "i32",
  ["unsigned long"]: "i64",
  ["signed long"]: "i64",
  ["float"]: "f32",
  ["double"]: "f64"
};

/**
 * Converts a constant to a Wasm const.
 */
export function convertConstantToWasmConst(
  constant: Constant
): WasmConst {
  if (constant.type === "IntegerConstant") {
    return {
      type: "IntegerConst",
      wasmVariableType: variableTypeToWasmType[constant.variableType],
      value: constant.value,
    };
  } else {
    return {
      type: "FloatConst",
      wasmVariableType: variableTypeToWasmType[constant.variableType],
      value: constant.value
    }
  }

}

/**
 * Retrieves information on variable from given function's symbol table, or from globals in wasmRoot if not found.
 */
export function retrieveVariableFromSymbolTable(
  symbolTable: WasmSymbolTable,
  variableName: string
) {
  let curr = symbolTable;

  while (curr !== null) {
    if (variableName in curr.variables) {
      return curr.variables[variableName];
    }
    curr = curr.parentTable;
  }
  // should not happen
  throw new TranslationError("Symbol not found");
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
  if (
    variable.type === "DataSegmentArray" ||
    variable.type === "DataSegmentVariable"
  ) {
    // this is a global variable
    return {
      type: "IntegerConst",
      wasmVariableType: WASM_ADDR_TYPE,
      value: BigInt(variable.offset),
    } as WasmIntegerConst;
  } else {
    // local variable
    return {
      type: "BinaryExpression",
      wasmVariableType: WASM_ADDR_TYPE,
      instruction: WASM_ADDR_SUB_INSTRUCTION,
      leftExpr: {
        type: "GlobalGet",
        name: BASE_POINTER,
        wasmVariableType: WASM_ADDR_TYPE,
      },
      rightExpr: {
        type: "IntegerConst",
        wasmVariableType: WASM_ADDR_TYPE,
        value: BigInt(variable.offset),
      } as WasmIntegerConst,
    } as WasmBinaryExpression;
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
    wasmVariableType: WASM_ADDR_TYPE,
    instruction: WASM_ADDR_ADD_INSTRUCTION,
    leftExpr: getVariableAddr(symbolTable, arrayName),
    // may need a numeric wrapper on the expression used to index the array to make sure it is unsigned int
    rightExpr: getAssignmentNodesValue(
      elementIndex.variableType,
      WASM_ADDR_CTYPE,
      {
        type: "BinaryExpression",
        instruction: WASM_ADDR_MUL_INSTRUCTION,
        wasmVariableType: WASM_ADDR_TYPE,
        leftExpr: translateExpression(wasmRoot, symbolTable, elementIndex),
        rightExpr: {
          type: "IntegerConst",
          wasmVariableType: WASM_ADDR_TYPE,
          value: BigInt(elementSize),
        } as WasmIntegerConst,
      } as WasmBinaryExpression
    ),
  } as WasmBinaryExpression;
}

/**
 * All the info needed to access memory during variable read/write.
 */
interface MemoryAccessDetails {
  wasmVariableType: WasmType; // variable type for memory access
  numOfBytes: MemoryVariableByteSize; // size of memory access
  addr: WasmExpression;
}

/**
 * Retrieve the details of the the primitive variable or array variable from enclosing func/wasmRoot
 */
export function getMemoryAccessDetails(
  wasmRoot: WasmModule,
  symbolTable: WasmSymbolTable,
  expr: VariableExpr | ArrayElementExpr
): MemoryAccessDetails {
  const variable = retrieveVariableFromSymbolTable(symbolTable, expr.name);
  if (expr.type === "VariableExpr") {
    if (
      !(
        variable.type === "LocalVariable" ||
        variable.type === "DataSegmentVariable"
      )
    ) {
      throw new TranslationError(
        "getMemoryAccessDetails error: memory access variable does not match."
      );
    }
    const v = variable as WasmLocalVariable | WasmDataSegmentVariable;
    return {
      addr: getVariableAddr(symbolTable, expr.name),
      numOfBytes: v.size,
      wasmVariableType: variable.wasmVarType,
    };
  } else if (expr.type === "ArrayElementExpr") {
    if (
      !(variable.type === "LocalArray" || variable.type === "DataSegmentArray")
    ) {
      throw new TranslationError(
        "getMemoryAccessDetails error: memory access variable does not match."
      );
    }
    const v = variable as WasmDataSegmentArray | WasmLocalArray;
    const t = {
      addr: getArrayElementAddr(
        wasmRoot,
        symbolTable,
        expr.name,
        expr.index,
        v.elementSize
      ),
      numOfBytes: wasmTypeToSize[v.wasmVarType], // the size of one element of //TODO: need to change when have more types
      wasmVariableType: v.wasmVarType,
    };
    return t;
  } else {
    console.assert(
      false,
      "getMemoryAccessDetails failed - no matching expression type"
    );
  }
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
    wasmVariableType: WASM_ADDR_TYPE,
    instruction: WASM_ADDR_ADD_INSTRUCTION,
    leftExpr: getVariableAddr(symbolTable, arrayName),
    rightExpr: {
      type: "IntegerConst",
      wasmVariableType: "i32",
      value: BigInt(elementIndex * elementSize),
    } as WasmIntegerConst,
  };
}

/**
 * Retrieves the numeric conversion instruction needed to convert WasmType "from" to "to".
 * Some operations require knowledge of the sign of the original C "from" variable to get the right instruction.
 */
function getNeededNumericConversionInstruction(
  from: WasmType,
  to: WasmType,
  intSignage?: "unsigned" | "signed"
): NumericConversionInstruction {
  if (from === "i32" && to === "i64") {
    if (typeof intSignage === "undefined") {
      throw new TranslationError(
        "Missing sign information for numeric conversion from i32 to i64"
      );
    } else if (intSignage === "signed") {
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
    if (typeof intSignage === "undefined") {
      throw new TranslationError(
        "Missing sign information for numeric conversion from i32 to f32"
      );
    } else if (intSignage === "signed") {
      return "f32.convert_i32_s";
    } else {
      return "f32.convert_i32_u";
    }
  } else if (from === "i64" && to === "f32") {
    if (typeof intSignage === "undefined") {
      throw new TranslationError(
        "Missing sign information for numeric conversion from i64 to f32"
      );
    } else if (intSignage === "signed") {
      return "f32.convert_i64_s";
    } else {
      return "f32.convert_i64_u";
    }
  } else if (from === "i32" && to === "f64") {
    if (typeof intSignage === "undefined") {
      throw new TranslationError(
        "Missing sign information for numeric conversion from i32 to f64"
      );
    } else if (intSignage === "signed") {
      return "f64.convert_i32_s";
    } else {
      return "f64.convert_i32_u";
    }
  } else if (from === "i64" && to === "f64") {
    if (typeof intSignage === "undefined") {
      throw new TranslationError(
        "Missing sign information for numeric conversion from i64 to f64"
      );
    } else if (intSignage === "signed") {
      return "f64.convert_i64_s";
    } else {
      return "f64.convert_i64_u";
    }
  } else if (from === "f32" && to === "i32") {
    if (typeof intSignage === "undefined") {
      throw new TranslationError(
        "Missing sign information for numeric conversion from f32 to i32"
      );
    } else if (intSignage === "signed") {
      return "i32.trunc_f32_s";
    } else {
      return "i32.trunc_f32_u";
    }
  } else if (from === "f64" && to === "i32") {
    if (typeof intSignage === "undefined") {
      throw new TranslationError(
        "Missing sign information for numeric conversion from f64 to i32"
      );
    } else if (intSignage === "signed") {
      return "i32.trunc_f64_s";
    } else {
      return "i32.trunc_f64_u";
    }
  } else if (from === "f32" && to === "i64") {
    if (typeof intSignage === "undefined") {
      throw new TranslationError(
        "Missing sign information for numeric conversion from f32 to i64"
      );
    } else if (intSignage === "signed") {
      return "i64.trunc_f32_s";
    } else {
      return "i64.trunc_f32_u";
    }
  } else if (from === "f64" && to === "i64") {
    if (typeof intSignage === "undefined") {
      throw new TranslationError(
        "Missing sign information for numeric conversion from f64 to i64"
      );
    } else if (intSignage === "signed") {
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
 * Get the WAT AST nodes that correspond to assigning the exact wasm expression being assigned to a variable.
 * Adds any wrapper nodes to the expression resposible for implict numeric conversion needed to ensure wasm types match,
 * and C standard implicit conversion rules are adhered to.
 */
export function getAssignmentNodesValue(
  variableType: VariableType, // the C variable type of variable being assigned to
  valueType: VariableType, // the C variable type of value being assigned
  translatedExpression: WasmExpression // the translated expression being assiged to the variable
): WasmExpression {
  const variableWasmType = variableTypeToWasmType[variableType]; // the wasm type of the variable being assigned to
  const valueWasmType = variableTypeToWasmType[valueType]; // the wasm type of the expression being assigned

  // sanity checks
  if (typeof variableWasmType === "undefined") {
    throw new TranslationError(
      `getAssignmentNodesValue: undefined variableWasmType: original type: ${variableType}`
    );
  }
  if (typeof valueWasmType === "undefined") {
    throw new TranslationError(
      `getAssignmentNodesValue: undefined valueWasmType: original type: ${valueType}`
    );
  }

  if (variableWasmType === valueWasmType) {
    // same wasm type already. no need any numeric conversion, and C implicit conversion rules will be adhered to
    return translatedExpression;
  }
  if (isUnsignedIntegerType(valueType)) {
    return {
      type: "NumericWrapper",
      instruction: getNeededNumericConversionInstruction(
        valueWasmType,
        variableWasmType,
        "unsigned"
      ),
      wasmVariableType: variableTypeToWasmType[variableType],
    } as WasmNumericConversionWrapper;
  } else if (isSignedIntegerType(valueType)) {
    return {
      type: "NumericWrapper",
      instruction: getNeededNumericConversionInstruction(
        valueWasmType,
        variableWasmType,
        "signed"
      ),
      wasmVariableType: variableTypeToWasmType[variableType],
    } as WasmNumericConversionWrapper;
  } else {
    return {
      type: "NumericWrapper",
      instruction: getNeededNumericConversionInstruction(
        valueWasmType,
        variableWasmType
      ),
      wasmVariableType: variableTypeToWasmType[variableType],
    } as WasmNumericConversionWrapper;
  }
}
