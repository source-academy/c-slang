import { ProcessingError, UnsupportedFeatureError, toJson } from "~src/errors";
import { Declaration, Initializer } from "~src/parser/c-ast/declaration";
import { ExpressionP, StatementP } from "~src/processor/c-ast/core";
import { FunctionDefinitionP } from "~src/processor/c-ast/function";
import {
  getDataTypeSize,
  isScalarType,
  unpackDataType,
} from "~src/processor/dataTypeUtil";
import { SymbolTable, VariableSymbolEntry } from "~src/processor/symbolTable";
import processExpression from "~src/processor/processExpression";
import {
  FloatDataType,
  IntegerDataType,
  PointerCDataType,
  PrimaryCDataType,
  ScalarCDataType,
} from "~src/common/types";
import { isFloatType, scalarDataTypeSizes } from "~src/common/utils";
import { MemoryStore } from "~src/processor/c-ast/memory";
import { createMemoryOffsetIntegerConstant } from "~src/processor/util";
import evaluateCompileTimeExpression from "~src/processor/evaluateCompileTimeExpression";
import {
  ArrayDataType,
  DataType,
  PointerDataType,
  PrimaryDataType,
} from "~src/parser/c-ast/dataTypes";
import { ConstantP } from "~src/processor/c-ast/expression/constants";
import {
  convertConstantToByteStr,
  getZeroInializerByteStrForDataType,
} from "~src/processor/byteStrUtil";

/**
 * Processes a Declaration node that is found within a function.
 * Adds the symbol to the symbolTable, and returns any memory store nodes needed for initialization, if any.
 */
export function processLocalVariableDeclaration(
  node: Declaration,
  symbolTable: SymbolTable,
  enclosingFunc: FunctionDefinitionP // reference to enclosing function, if any
): StatementP[] {
  try {
    let symbolEntry = symbolTable.addEntry(node);
    if (node.dataType.type === "function") {
      return [];
    }

    if (typeof enclosingFunc !== "undefined") {
      enclosingFunc.sizeOfLocals += getDataTypeSize(node.dataType);
    }

    symbolEntry = symbolEntry as VariableSymbolEntry; // definitely not dealing with a function declaration already

    if (typeof node.initializer !== "undefined") {
      return unpackLocalVariableInitializerAccordingToDataType(symbolEntry, node.initializer, symbolTable);
    } else {
      return [];
    }
  } catch (e) {
    if (e instanceof ProcessingError) {
      e.addPositionInfo(node.position);
    }
    throw e;
  }
}

export function unpackLocalVariableInitializerAccordingToDataType(
  variableSymbolEntry: VariableSymbolEntry, // the symbol entry of the the variable being initialized
  initalizer: Initializer | null,
  symbolTable: SymbolTable
): MemoryStore[] {
  const memoryStoreStatements: MemoryStore[] = [];
  let currOffset = 0;
  variableSymbolEntry.offset; // offset to use for address in memory store statements
  function helper(dataType: DataType, initalizer: Initializer | null) {
    if (initalizer === null) {
      // indicaates that there is no initializer for this particualr data field
      const unpackedDataType = unpackDataType(dataType);
      for (const primaryDataObject of unpackedDataType) {
        let zeroExpression: ConstantP;
        if (isFloatType(primaryDataObject.dataType)) {
          zeroExpression = {
            type: "FloatConstant",
            value: 0,
            dataType: primaryDataObject.dataType as FloatDataType,
          };
        } else {
          zeroExpression = {
            type: "IntegerConstant",
            value: 0n,
            dataType: primaryDataObject.dataType as IntegerDataType,
          };
        }

        memoryStoreStatements.push({
          type: "MemoryStore",
          address: {
            type:
              variableSymbolEntry.type === "globalVariable"
                ? "DataSegmentAddress"
                : "LocalAddress",
            offset: createMemoryOffsetIntegerConstant(currOffset), // offset of this primary data object = offset of variable it belongs to + offset within variable type
            dataType: primaryDataObject.dataType,
          },
          value: zeroExpression,
          dataType: primaryDataObject.dataType,
        });

        currOffset += scalarDataTypeSizes[primaryDataObject.dataType];
      }
    } else {
      if (isScalarType(dataType)) {
        if (initalizer.type === "InitializerList") {
          throw new ProcessingError("Excess elements in scalar initializer");
        } // TODO: perhaps throw warning instead, although this is undefined behaviour

        const processedExpression = processExpression(
          initalizer.value,
          symbolTable
        );

        if (processedExpression.exprs.length > 1) {
          throw new ProcessingError(
            "Cannot intitialize scalar type with aggregate type"
          );
        }

        dataType = dataType as PrimaryDataType | PointerDataType;

        memoryStoreStatements.push({
          type: "MemoryStore",
          address: {
            type:
              variableSymbolEntry.type === "globalVariable"
                ? "DataSegmentAddress"
                : "LocalAddress",
            offset: createMemoryOffsetIntegerConstant(currOffset), // offset of this primary data object = offset of variable it belongs to + offset within variable type
            dataType:
              dataType.type === "pointer"
                ? "pointer"
                : dataType.primaryDataType,
          },
          value: processedExpression.exprs[0],
          dataType:
            dataType.type === "pointer" ? "pointer" : dataType.primaryDataType,
        });
      } else {
        if (initalizer.type === "InitializerSingle") {
          throw new ProcessingError("Invalid initializer for aggregate type");
        }

        if (dataType.type === "array") {
          const numElements = evaluateCompileTimeExpression(
            dataType.numElements
          ).value;

          if (initalizer.values.length > numElements) {
            throw new ProcessingError("Excess elements in aggregate initializer");
          }

          let i = 0;
          for (; i < initalizer.values.length; i++) {
            helper(dataType.elementDataType, initalizer);
          }
          // zero out any uninitialized elements
          for (; i < numElements; ++i) {
            helper(dataType.elementDataType, null);
          }
        } else if (dataType.type === "struct") {
          // TODO: structs
          throw new UnsupportedFeatureError("Structs not suported yet");
        }
      }
    }
  }
  helper(variableSymbolEntry.dataType, initalizer);
  return memoryStoreStatements;
}

/**
 * Processes a data segment variable declaration, returns the byte string to intialize that data segment with.
 */
export function processDataSegmentVariableDeclaration(
  node: Declaration,
  symbolTable: SymbolTable
): string {
  symbolTable.addEntry(node);
  if (node.dataType.type === "function") {
    if (typeof node.initializer !== "undefined") {
      throw new ProcessingError(
        `Function ${node.name} is initialized like a variable`
      );
    }
    return ""; // nothing to initalizera function with
  }

  return unpackDataSegmentInitializerAccordingToDataType(
    node.dataType,
    typeof node.initializer !== "undefined" ? node.initializer : null
  );
}
/**
 * Function to recursively go through the declaration data type and the intiializer to assign appropriately
 * (and handle zeroing of memory when insufficient intializer exprs are present).
 * Returns byte string of bytes to intialize the memory in the data segment that the declared variabled occupies with.
 */
function unpackDataSegmentInitializerAccordingToDataType(
  dataType: DataType,
  initalizer: Initializer | null
): string {
  let byteStr = "";
  function helper(dataType: DataType, initalizer: Initializer | null) {
    if (initalizer === null) {
      // indicaates that there is no initializer for this particualr data field
      byteStr += getZeroInializerByteStrForDataType(dataType);
    } else {
      if (isScalarType(dataType)) {
        if (initalizer.type === "InitializerList") {
          throw new ProcessingError("Excess elements in scalar initializer");
        } // TODO: perhaps throw warning instead, although this is undefined behaviour

        try {
          const processedConstant = evaluateCompileTimeExpression(
            initalizer.value
          );
          byteStr += convertConstantToByteStr(processedConstant);
        } catch (e) {
          if (e instanceof ProcessingError) {
            throw new ProcessingError(
              "Initializer element is not compile-time constant"
            );
          }
          throw e;
        }
      } else {
        if (initalizer.type === "InitializerSingle") {
          throw new ProcessingError("Invalid initializer for aggregate type");
        }

        if (dataType.type === "array") {
          const numElements = evaluateCompileTimeExpression(
            dataType.numElements
          ).value;
          if (initalizer.values.length > numElements) {
            throw new ProcessingError("Excess elements in aggregate initializer");
          }
          let i = 0;
          for (; i < initalizer.values.length; i++) {
            helper(dataType.elementDataType, initalizer);
          }
          // zero out any uninitialized elements
          for (; i < numElements; ++i) {
            helper(dataType.elementDataType, null);
          }
        } else if (dataType.type === "struct") {
          // TODO: structs
          throw new UnsupportedFeatureError("structs not suported yet");
        }
      }
    }
  }
  helper(dataType, initalizer);
  return byteStr;
}
