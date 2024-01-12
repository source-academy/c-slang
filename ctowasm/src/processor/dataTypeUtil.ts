/**
 * Some utility functions used by the processor when working with data types.
 */

import { DataType } from "~src/parser/c-ast/dataTypes";

import { POINTER_SIZE } from "~src/common/constants";
import { scalarDataTypeSizes } from "~src/common/utils";
import { ProcessingError, UnsupportedFeatureError, toJson } from "~src/errors";
import evaluateCompileTimeExpression from "~src/processor/evaluateCompileTimeExpression";
import { ScalarCDataType } from "~src/common/types";
import { IntegerConstant } from "~src/parser/c-ast/expression/constant";
import { createMemoryOffsetIntegerConstant } from "~src/processor/util";
import { IntegerConstantP } from "~src/processor/c-ast/expression/constants";

/**
 * Returns the size in bytes of a data type.
 */
export function getDataTypeSize(varType: DataType): number {
  if (varType.type === "primary") {
    return scalarDataTypeSizes[varType.primaryDataType];
  } else if (varType.type === "pointer") {
    return POINTER_SIZE;
  } else if (varType.type === "array") {
    try {
      const numElementsConstant = evaluateCompileTimeExpression(
        varType.numElements
      );
      if (numElementsConstant.type === "FloatConstant") {
        throw new ProcessingError("Array size must be an integer-type");
      }
      return (
        getDataTypeSize(varType.elementDataType) *
        Number(numElementsConstant.value)
      );
    } catch (e) {
      if (e instanceof ProcessingError) {
        throw new ProcessingError(
          "Array size must be compile-time constant expression (Variable Length Arrays not supported)"
        );
      } else {
        throw e;
      }
    }
  } else if (varType.type === "struct") {
    // TODO: when structs supported
    throw new UnsupportedFeatureError(
      "getDataTypeSize(): structs not yet supported"
    );
  } else {
    throw new Error(
      `getDataTypeSize(): unhandled data type: ${toJson(varType)}`
    );
  }
}
/**
 * Returns true if the type is scalar.
 * Only primary data types and pointers are scalar.
 */

export function isScalarType(dataType: DataType) {
  return dataType.type === "primary" || dataType.type === "pointer";
}

export function isArithmeticType(dataType: DataType) {
  return dataType.type === "primary";
}

/**
 * Performs a deep comparison of datatypes, and returns true if they are equal.
 */
export function areDataTypesEqual(dataTypeA: DataType, dataTypeB: DataType) {
  return toJson(dataTypeA) === toJson(dataTypeB);
}

/**
 * Utlity function to generate data type string.
 * TODO: change the json generation to a proper string
 */
export function stringifyDataType(dataType: DataType) {
  return toJson(dataType);
}

/**
 * Represents a primary data type (scalar) that is part of a DataType. e.g. the field of a struct
 */
export interface PrimaryDataTypeMemoryObjectDetails {
  dataType: ScalarCDataType;
  offset: number; // offset in number of bytes from the first byte of the memory object that this primary data type object belongs in.
}
/**
 * Unpacks an data type into its constituent primary data types (including multi dim arrays and structs)
 */
export function unpackDataType(
  dataType: DataType
): PrimaryDataTypeMemoryObjectDetails[] {
  let currOffset = 0;
  const memoryObjects: PrimaryDataTypeMemoryObjectDetails[] = [];
  function recursiveHelper(dataType: DataType) {
    if (dataType.type === "primary") {
      memoryObjects.push({
        dataType: dataType.primaryDataType,
        offset: currOffset,
      });
      currOffset += getDataTypeSize(dataType);
    } else if (dataType.type === "pointer") {
      memoryObjects.push({
        dataType: "pointer",
        offset: currOffset,
      });
      currOffset += getDataTypeSize(dataType);
    } else if (dataType.type === "array") {
      const numElements = evaluateCompileTimeExpression(
        dataType.numElements
      ).value;
      for (let i = 0; i < numElements; ++i) {
        recursiveHelper(dataType.elementDataType);
      }
    } else if (dataType.type === "struct") {
      //TODO: handel when structs done
      throw new UnsupportedFeatureError("Structs not supported");
    } else {
      throw new ProcessingError(
        `unpackDataType(): Invalid data type to unpack: ${toJson(dataType)}`
      );
    }
  }
  recursiveHelper(dataType);
  return memoryObjects;
}

/**
 * Unpacks a datatype into its memory object details, when it is used as expression.
 */
export function unpackExpressionDataType(
  dataType: DataType
): PrimaryDataTypeMemoryObjectDetails[] {
  const primaryDataTypes: PrimaryDataTypeMemoryObjectDetails[] = [];
  if (dataType.type === "primary") {
    primaryDataTypes.push({
      offset: 0,
      dataType: dataType.primaryDataType,
    });
  } else if (dataType.type === "pointer" || dataType.type === "array") {
    // arrays are also interpreted as pointers
    primaryDataTypes.push({
      offset: 0,
      dataType: "pointer",
    });
  } else if (dataType.type === "struct") {
    // TODO: add struct handling
    throw new UnsupportedFeatureError("Structs not yet supported");
  } else if (dataType.type === "function") {
    throw new ProcessingError("Cannot treat function as a variable");
  }

  return primaryDataTypes;
}
