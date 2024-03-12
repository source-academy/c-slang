/**
 * Some utility functions used by the processor when working with data types.
 */

import {
  DataType,
  FunctionDataType,
  StructDataType,
  StructSelfPointer,
} from "~src/parser/c-ast/dataTypes";

import { ProcessingError, toJson } from "~src/errors";
import evaluateCompileTimeExpression from "~src/processor/evaluateCompileTimeExpression";
import { ScalarCDataType } from "~src/common/types";
import {
  getSizeOfScalarDataType,
  isFloatType,
  isIntegerType,
  primaryDataTypeSizes,
} from "~src/common/utils";
import { ENUM_DATA_TYPE, POINTER_SIZE } from "~src/common/constants";
import { FunctionDetails } from "~src/processor/c-ast/function";

/**
 * Returns the size in bytes of a data type.
 */
export function getDataTypeSize(
  dataType: DataType | StructSelfPointer,
): number {
  if (
    dataType.type === "primary" ||
    dataType.type === "pointer" ||
    dataType.type === "struct self pointer"
  ) {
    return getSizeOfScalarDataType(
      dataType.type === "pointer" || dataType.type === "struct self pointer"
        ? "pointer"
        : dataType.primaryDataType,
    );
  } else if (dataType.type === "array") {
    try {
      const numElementsConstant = evaluateCompileTimeExpression(
        dataType.numElements,
      );
      if (numElementsConstant.type === "FloatConstant") {
        throw new ProcessingError("Array size must be an integer-type");
      }
      return (
        getDataTypeSize(dataType.elementDataType) *
        Number(numElementsConstant.value)
      );
    } catch (e) {
      if (e instanceof ProcessingError) {
        throw new ProcessingError(
          "Array size must be compile-time constant expression (Variable Length Arrays not supported)",
        );
      } else {
        throw e;
      }
    }
  } else if (dataType.type === "struct") {
    return dataType.fields.reduce(
      (sum, field) =>
        sum +
        (field.dataType.type === "struct self pointer"
          ? POINTER_SIZE
          : getDataTypeSize(field.dataType)),
      0,
    );
  } else if (dataType.type === "enum") {
    return primaryDataTypeSizes[ENUM_DATA_TYPE];
  } else {
    throw new Error(
      `getDataTypeSize(): unhandled data type: ${toJson(dataType)}`,
    );
  }
}
/**
 * Returns true if the type is scalar.
 * Only primary data types and pointers are scalar.
 */

export function isScalarDataType(dataType: DataType) {
  return (
    dataType.type === "primary" ||
    dataType.type === "pointer" ||
    dataType.type === "enum"
  ); // enums are signed ints, thus scalar
}

export function isIntegralDataType(dataType: DataType) {
  return (
    (dataType.type === "primary" && isIntegerType(dataType.primaryDataType)) ||
    dataType.type === "enum"
  );
}

export function isFloatDataType(dataType: DataType) {
  return dataType.type === "primary" && isFloatType(dataType.primaryDataType);
}

export function isArithmeticDataType(dataType: DataType) {
  return dataType.type === "primary" || dataType.type === "enum";
}

export function isVoidPointer(dataType: DataType) {
  return dataType.type === "pointer" && dataType.pointeeType === null;
}

// /**
//  * Checks two data types to determine if they are compatible (meaning one can be assigned to another).
//  * TODO: add proper data type compatibility checks
//  */
// export function checkDataTypeCompatibility(
//   dataTypeA: DataType,
//   dataTypeB: DataType
// ): boolean {
//   if (dataTypeA.type !== dataTypeB.type) {
//     return false
//   };
//   if (dataTypeA.type === "primary") {

//   }
// }

// export function checkPrimaryDataTypeCompatibility(dataTypeA: PrimaryCDataType, dataTypeB: PrimaryCDataType) {
//   return
// }

/**
 * Utlity function to generate data type string.
 */
// export function stringifyDataType(dataType: DataType) {
//   let str = "";
//   function helperFunction(dataType: DataType) {
//     if (dataType.type === "primary") {
//       str = `${dataType.primaryDataType} ${str}`;
//     } else if (dataType.type === "array") {
//       helperFunction(dataType.elementDataType);
//       str += " []";
//     } else if (dataType.type === "pointer") {
//       if (dataType.pointeeType === null) {
//         str = "void *";
//       } else if (dataType.pointeeType.type === "function" || dataType.pointeeType.type === "array") {
//         str = `(*${str})`;
//       } else {
//         str = `*${str}`;
//       }
//     } else if (dataType.type === "function") {
//       if (dataType.returnType === null) {
//         str = `void ${str}`;
//       } else {helperFunction(dataType.returnType)}
//       str += "(";
//       for (let i = 0; i < dataType.parameters.length - 1; ++i) {
//         str += stringifyDataType(dataType.parameters[i]);
//         str += ", ";
//       }
//       str += ")";
//     }
//   }
//   helperFunction(dataType);
//   return str;
// }

export function stringifyDataType(dataType: DataType) {
  function helperFunction(dataType: DataType): string {
    if (dataType.type === "primary") {
      return `${dataType.isConst ? "const " : ""}${dataType.primaryDataType}`;
    } else if (dataType.type === "array") {
      return `${dataType.isConst ? "const " : ""}array with size ${dataType.numElements} of ${stringifyDataType(dataType.elementDataType)}`;
    } else if (dataType.type === "pointer") {
      return `${dataType.isConst ? "const " : ""}pointer to ${dataType.pointeeType === null ? "void" : stringifyDataType(dataType.pointeeType)}`
    } else if (dataType.type === "function") {
      return `function (${dataType.parameters.map(stringifyDataType).join(", ")}) returning ${dataType.returnType === null ? "void" : stringifyDataType(dataType.returnType)}`;
    } else if (dataType.type === "struct") {
      return `struct ${dataType.tag}`;
    } else if (dataType.type === "enum") {
      return `enum ${dataType.tag}`;
    } else {
      console.assert(false, "stringifyDataType() unreachable else");
      return "";
    }
  }
  return helperFunction(dataType);
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
  dataType: DataType,
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
        dataType.numElements,
      ).value;
      for (let i = 0; i < numElements; ++i) {
        recursiveHelper(dataType.elementDataType);
      }
    } else if (dataType.type === "struct") {
      for (const field of dataType.fields) {
        if (field.dataType.type === "struct self pointer") {
          // pointer to the struct itself
          memoryObjects.push({
            dataType: "pointer",
            offset: currOffset,
          });
          currOffset += getDataTypeSize(dataType);
        } else {
          recursiveHelper(field.dataType);
        }
      }
    } else if (dataType.type === "enum") {
      memoryObjects.push({
        dataType: ENUM_DATA_TYPE,
        offset: currOffset,
      });
      currOffset += getDataTypeSize(dataType);
    } else {
      throw new ProcessingError(
        `unpackDataType(): Invalid data type to unpack: ${toJson(dataType)}`,
      );
    }
  }
  recursiveHelper(dataType);
  return memoryObjects;
}

/**
 * Returns the number of primary objects that compose a data type.
 */
function getDataTypeNumberOfPrimaryObjects(dataType: DataType): number {
  if (
    dataType.type === "primary" ||
    dataType.type === "pointer" ||
    dataType.type === "enum"
  ) {
    return 1;
  } else if (dataType.type === "array") {
    try {
      const numElementsConstant = evaluateCompileTimeExpression(
        dataType.numElements,
      );
      if (numElementsConstant.type === "FloatConstant") {
        throw new ProcessingError("Array size must be an integer-type");
      }
      return (
        getDataTypeNumberOfPrimaryObjects(dataType.elementDataType) *
        Number(numElementsConstant.value)
      );
    } catch (e) {
      if (e instanceof ProcessingError) {
        throw new ProcessingError(
          "Array size must be compile-time constant expression (Variable Length Arrays not supported)",
        );
      } else {
        throw e;
      }
    }
  } else if (dataType.type === "struct") {
    return dataType.fields.reduce(
      (sum, field) =>
        sum +
        (field.dataType.type === "struct self pointer"
          ? 1
          : getDataTypeNumberOfPrimaryObjects(field.dataType)),
      0,
    );
  } else {
    throw new Error(
      `getDataTypeNumberOfPrimaryObjects(): unhandled data type: ${toJson(
        dataType,
      )}`,
    );
  }
}

/**
 * Determines the index of the given field tag in a struct based in terms of the index in the unpacked primary data objects
 * that is returned by running unpackDataType on the whole struct,
 * as well as the datatype of the field.
 */
export function determineIndexAndDataTypeOfFieldInStruct(
  structDataType: StructDataType,
  fieldTag: string,
): { fieldIndex: number; fieldDataType: DataType | StructSelfPointer } {
  let currIndex = 0;
  for (const field of structDataType.fields) {
    if (fieldTag === field.tag) {
      return { fieldIndex: currIndex, fieldDataType: field.dataType };
    }
    currIndex +=
      field.dataType.type === "struct self pointer"
        ? 1
        : getDataTypeNumberOfPrimaryObjects(field.dataType);
  }
  throw new ProcessingError(
    `Struct${
      structDataType.tag !== null ? " " + structDataType.tag : ""
    } has no member named '${fieldTag}'`,
  );
}

export function convertFunctionDataTypeToFunctionDetails(
  dataType: FunctionDataType,
): FunctionDetails {
  const functionDetails: FunctionDetails = {
    sizeOfParams: 0,
    sizeOfReturn: 0,
    parameters: [],
    returnObjects: null,
  };

  if (dataType.returnType !== null) {
    if (dataType.returnType.type === "array") {
      throw new ProcessingError(
        "Array is not a valid return type from a function",
      );
    }

    functionDetails.sizeOfReturn += getDataTypeSize(dataType.returnType);
    functionDetails.returnObjects = unpackDataType(dataType.returnType).map(
      (scalarDataType) => ({
        dataType: scalarDataType.dataType,
        offset: scalarDataType.offset,
      }),
    );
  }

  let offset = 0;
  for (const param of dataType.parameters) {
    // sanity check, as parser should have converted all array params into pointers.
    if (param.type === "array") {
      throw new ProcessingError(
        "Compiler error: The type of a function parameter should not be an array after parsing",
      );
    }
    const dataTypeSize = getDataTypeSize(param);
    offset -= dataTypeSize;
    functionDetails.sizeOfParams += dataTypeSize;
    const unpackedParam = unpackDataType(param).map((scalarDataType) => ({
      dataType: scalarDataType.dataType,
      offset: offset + scalarDataType.offset, // offset of entire aggregate object + offset of particular sacalar data type within object
    }));
    // need to load unpacked param in reverse order, as in stack frame creation, the highest address subobject of an aggregate type gets loaded first as the stack frame grows from high to low address
    functionDetails.parameters.push(...unpackedParam.reverse());
  }

  return functionDetails;
}
