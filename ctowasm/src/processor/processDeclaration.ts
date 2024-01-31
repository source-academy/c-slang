import { ProcessingError } from "~src/errors";
import {
  VariableDeclaration,
  Initializer,
  InitializerSingle,
  Declaration,
} from "~src/parser/c-ast/declaration";
import { StatementP } from "~src/processor/c-ast/core";
import { FunctionDefinitionP } from "~src/processor/c-ast/function";
import {
  getDataTypeSize,
  isFloatDataType,
  isScalarDataType,
  unpackDataType,
} from "~src/processor/dataTypeUtil";
import { SymbolTable, VariableSymbolEntry } from "~src/processor/symbolTable";
import processExpression from "~src/processor/processExpression";
import {
  FloatDataType,
  IntegerDataType,
  ScalarCDataType,
} from "~src/common/types";
import { getSizeOfScalarDataType } from "~src/common/utils";
import { MemoryStore } from "~src/processor/c-ast/memory";
import {
  createMemoryOffsetIntegerConstant,
  getDataTypeOfExpression,
} from "~src/processor/util";
import evaluateCompileTimeExpression from "~src/processor/evaluateCompileTimeExpression";
import { DataType, PrimaryDataType } from "~src/parser/c-ast/dataTypes";
import { ConstantP } from "~src/processor/c-ast/expression/constants";
import {
  convertConstantToByteStr,
  getZeroInializerByteStrForDataType,
} from "~src/processor/byteStrUtil";
import { ENUM_DATA_TYPE, POINTER_TYPE } from "~src/common/constants";
import processEnumDeclaration from "~src/processor/processEnumDeclaration";

/**
 * Processes a Declaration node that is found within a function.
 * Adds the symbol to the symbolTable, and returns any memory store nodes needed for initialization, if any.
 */
export function processLocalDeclaration(
  declaration: Declaration,
  symbolTable: SymbolTable,
  enclosingFunc: FunctionDefinitionP, // reference to enclosing function, if any
): StatementP[] {
  try {
    if (declaration.type === "Declaration") {
      let symbolEntry = symbolTable.addEntry(declaration);
      if (
        symbolEntry.type === "function" ||
        symbolEntry.type === "dataSegmentVariable"
      ) {
        // if the declaration was of a function or it was of a static variable then there are no statements to carry out in the function
        return [];
      }

      console.assert(
        symbolEntry.type === "localVariable",
        "processLocalDeclaration(): symbolEntry does not have type 'localVariable'",
      );

      if (typeof enclosingFunc !== "undefined") {
        enclosingFunc.sizeOfLocals += getDataTypeSize(declaration.dataType);
      }

      symbolEntry = symbolEntry as VariableSymbolEntry; // definitely not dealing with a function declaration already

      if (typeof declaration.initializer !== "undefined") {
        return unpackLocalVariableInitializerAccordingToDataType(
          symbolEntry,
          declaration.initializer,
          symbolTable,
        );
      } else {
        return [];
      }
    } else if (declaration.type === "EnumDeclaration") {
      processEnumDeclaration(declaration, symbolTable);
      return [];
    } else {
      console.assert(false, "Unknown declaration type");
      return [];
    }
  } catch (e) {
    if (e instanceof ProcessingError) {
      e.addPositionInfo(declaration.position);
    }
    throw e;
  }
}

/**
 * Some basic checks for invalid initialization.
 */
function runInitializerChecks(dataType: DataType, initalizer: Initializer) {
  if (isScalarDataType(dataType)) {
    if (initalizer.type === "InitializerList" && initalizer.values.length > 1) {
      throw new ProcessingError("Excess elements in scalar intializer"); // undefined behaviour, for not throw TODO: perhaps toggle based on flag
    }
  } else if (dataType.type === "function") {
    throw new ProcessingError(
      `A function cannot be initialized like a variable`,
    );
  } else if (
    dataType.type === "array" &&
    initalizer.type === "InitializerSingle"
  ) {
    throw new ProcessingError("Invalid intializer for aggregate type");
  }
}

export function unpackLocalVariableInitializerAccordingToDataType(
  variableSymbolEntry: VariableSymbolEntry, // the symbol entry of the the variable being initialized
  initializer: Initializer,
  symbolTable: SymbolTable,
): MemoryStore[] {
  const memoryStoreStatements: MemoryStore[] = [];
  let currOffset = variableSymbolEntry.offset; // offset to use for address in memory store statements

  runInitializerChecks(variableSymbolEntry.dataType, initializer);

  function helper(
    dataType: DataType,
    initializer: Initializer,
    offset: number,
  ): number {
    if (
      dataType.type === "primary" ||
      dataType.type === "pointer" ||
      dataType.type === "enum"
    ) {
      let scalarDataType: ScalarCDataType;
      if (dataType.type === "pointer") {
        scalarDataType = "pointer";
      } else if (dataType.type === "enum") {
        scalarDataType = ENUM_DATA_TYPE;
      } else {
        scalarDataType = dataType.primaryDataType;
      }

      if (initializer.type === "InitializerSingle") {
        memoryStoreStatements.push({
          type: "MemoryStore",
          address: {
            type: "LocalAddress",
            offset: createMemoryOffsetIntegerConstant(currOffset), // offset of this primary data object = offset of variable it belongs to + offset within variable type
            dataType: "pointer",
          },
          value: processExpression(initializer.value, symbolTable).exprs[0],
          dataType: scalarDataType,
        });
        currOffset += getDataTypeSize(dataType);
      } else {
        if (offset >= initializer.values.length) {
          let zeroExpression: ConstantP;
          if (isFloatDataType(dataType)) {
            zeroExpression = {
              type: "FloatConstant",
              value: 0,
              dataType: (dataType as PrimaryDataType)
                .primaryDataType as FloatDataType,
            };
          } else {
            zeroExpression = {
              type: "IntegerConstant",
              value: 0n,
              dataType:
                dataType.type === "pointer"
                  ? POINTER_TYPE
                  : dataType.type === "enum"
                  ? ENUM_DATA_TYPE
                  : (dataType.primaryDataType as IntegerDataType),
            };
          }
          memoryStoreStatements.push({
            type: "MemoryStore",
            address: {
              type: "LocalAddress",
              offset: createMemoryOffsetIntegerConstant(currOffset), // offset of this primary data object = offset of variable it belongs to + offset within variable type
              dataType: "pointer",
            },
            value: zeroExpression,
            dataType: scalarDataType,
          });
          currOffset += getDataTypeSize(dataType);
        } else {
          // unpack the elemetn at offset of the list until hit a single
          //TODO: perhaps throw warning about braces arnd scalar initializer
          let firstInitializer = initializer.values[offset++];
          while (firstInitializer.type === "InitializerList") {
            if (firstInitializer.values.length === 0) {
              // empty initializer list
              let zeroExpression: ConstantP;
              if (isFloatDataType(dataType)) {
                zeroExpression = {
                  type: "FloatConstant",
                  value: 0,
                  dataType: (dataType as PrimaryDataType)
                    .primaryDataType as FloatDataType,
                };
              } else {
                zeroExpression = {
                  type: "IntegerConstant",
                  value: 0n,
                  dataType:
                    dataType.type === "pointer"
                      ? POINTER_TYPE
                      : dataType.type === "enum"
                      ? ENUM_DATA_TYPE
                      : (dataType.primaryDataType as IntegerDataType),
                };
              }
              memoryStoreStatements.push({
                type: "MemoryStore",
                address: {
                  type: "LocalAddress",
                  offset: createMemoryOffsetIntegerConstant(currOffset), // offset of this primary data object = offset of variable it belongs to + offset within variable type
                  dataType: "pointer",
                },
                value: zeroExpression,
                dataType: scalarDataType,
              });
              currOffset += getDataTypeSize(dataType);
              return offset;
            }
            firstInitializer = firstInitializer.values[0];
          }
          memoryStoreStatements.push({
            type: "MemoryStore",
            address: {
              type: "LocalAddress",
              offset: createMemoryOffsetIntegerConstant(currOffset), // offset of this primary data object = offset of variable it belongs to + offset within variable type
              dataType: "pointer",
            },
            value: processExpression(firstInitializer.value, symbolTable)
              .exprs[0],
            dataType: scalarDataType,
          });
          currOffset += getDataTypeSize(dataType);
        }
      }
    } else if (dataType.type === "array") {
      if (initializer.type === "InitializerSingle") {
        // TODO: check if this is correct
        throw new ProcessingError("Invalid initializer for aggregate type");
      }
      const numElements = evaluateCompileTimeExpression(
        dataType.numElements,
      ).value;
      for (let i = 0; i < numElements; i++) {
        if (
          dataType.elementDataType.type === "pointer" ||
          dataType.elementDataType.type === "primary"
        ) {
          // same initializer list, offset shld incr by 1
          offset = helper(dataType.elementDataType, initializer, offset);
        } else if (dataType.elementDataType.type === "struct") {
          if (
            offset < initializer.values.length &&
            initializer.values[offset].type === "InitializerSingle"
          ) {
            // special handling in case the current initializer at offset is a struct expression
            const processedExpr = processExpression(
              (initializer.values[offset] as InitializerSingle).value,
              symbolTable,
            );
            const dataTypeOfExpr = getDataTypeOfExpression({
              expression: processedExpr,
            });
            if (dataTypeOfExpr.type === "struct") {
              // TODO: check two structs are compatible
              const unpackedStruct = unpackDataType(dataType.elementDataType);
              for (let i = 0; i < unpackedStruct.length; ++i) {
                const primaryExpr = processedExpr.exprs[i];
                const primaryMemoryObj = unpackedStruct[i];
                memoryStoreStatements.push({
                  type: "MemoryStore",
                  address: {
                    type: "LocalAddress",
                    offset: createMemoryOffsetIntegerConstant(currOffset), // offset of this primary data object = offset of variable it belongs to + offset within variable type
                    dataType: "pointer",
                  },
                  value: primaryExpr,
                  dataType: primaryMemoryObj.dataType,
                });
                currOffset += getSizeOfScalarDataType(
                  primaryMemoryObj.dataType,
                );
              }
              ++offset;
              continue;
            }
          }
          if (
            offset >= initializer.values.length ||
            initializer.values[offset].type === "InitializerSingle"
          ) {
            // sub aggregate will take from the same "level" of initalizer list, offset will be incremented
            offset = helper(dataType.elementDataType, initializer, offset);
          } else {
            helper(dataType.elementDataType, initializer.values[offset++], 0); // fresh offset for sub aggregate
          }
        } else if (dataType.elementDataType.type === "array") {
          if (
            offset >= initializer.values.length ||
            initializer.values[offset].type === "InitializerSingle"
          ) {
            // sub aggregate will take from the same "level" of initalizer list, offset will be incremented
            offset = helper(dataType.elementDataType, initializer, offset);
          } else {
            helper(dataType.elementDataType, initializer.values[offset++], 0); // fresh offset for sub aggregate
          }
        } else if (dataType.elementDataType.type === "function") {
          // should not be possible
          throw new ProcessingError("Cannot have array of functions");
        }
      }
    } else if (dataType.type === "struct") {
      if (initializer.type === "InitializerSingle") {
        const processedExpr = processExpression(initializer.value, symbolTable);
        const dataTypeOfExpr = getDataTypeOfExpression({
          expression: processedExpr,
        });
        // handle direct initialization of struct with another struct
        if (dataTypeOfExpr.type === "struct") {
          // TODO: check two structs are compatible
          const unpackedStruct = unpackDataType(dataType);
          for (let i = 0; i < unpackedStruct.length; ++i) {
            const primaryExpr = processedExpr.exprs[i];
            const primaryMemoryObj = unpackedStruct[i];
            memoryStoreStatements.push({
              type: "MemoryStore",
              address: {
                type: "LocalAddress",
                offset: createMemoryOffsetIntegerConstant(currOffset), // offset of this primary data object = offset of variable it belongs to + offset within variable type
                dataType: "pointer",
              },
              value: primaryExpr,
              dataType: primaryMemoryObj.dataType,
            });
            currOffset += getSizeOfScalarDataType(primaryMemoryObj.dataType);
          }
          return offset;
        } else {
          throw new ProcessingError(
            "Cannot assign scalar expression to aggregate type",
          );
        }
      }

      for (const field of dataType.fields) {
        if (
          field.dataType.type === "pointer" ||
          field.dataType.type === "primary"
        ) {
          // same initializer list, offset shld incr by 1
          offset = helper(field.dataType, initializer, offset);
        } else if (
          field.dataType.type === "array" ||
          field.dataType.type === "struct"
        ) {
          if (
            offset >= initializer.values.length ||
            initializer.values[offset].type === "InitializerSingle"
          ) {
            // sub aggregate will take from the same "level" of initalizer list, offset will be incremented
            offset = helper(field.dataType, initializer, offset);
          } else {
            helper(field.dataType, initializer.values[offset++], 0); // fresh offset for sub aggregate
          }
        } else if (field.dataType.type === "function") {
          throw new ProcessingError("Function is not valid field of struct");
        }
      }
    } else if (dataType.type === "function") {
      throw new ProcessingError("Cannot initialize function type");
    }
    return offset;
  }

  helper(variableSymbolEntry.dataType, initializer, 0);
  return memoryStoreStatements;
}

export function processGlobalScopeDeclaration(
  declaration: Declaration,
  symbolTable: SymbolTable,
) {
  if (declaration.type === "Declaration") {
    processDataSegmentVariableDeclaration(declaration, symbolTable);
  } else if (declaration.type === "EnumDeclaration") {
    processEnumDeclaration(declaration, symbolTable);
  } else {
    console.assert(false, "Unknown declaration type");
  }
}

/**
 * Processes a data segment variable declaration. 
 */
export function processDataSegmentVariableDeclaration(
  node: VariableDeclaration,
  symbolTable: SymbolTable,
) {
  try {
    const symbolEntry = symbolTable.addEntry(node);
    if (node.dataType.type === "function") {
      if (typeof node.initializer !== "undefined") {
        throw new ProcessingError(
          `Function ${node.name} is initialized like a variable`,
        );
      }
    }

    // sanity check
    if (symbolEntry.type === "localVariable") {
      throw new ProcessingError(
        "processDataSegmentVariableDeclaration: symbol entry has type 'localVariable'",
      );
    }
  } catch (e) {
    if (e instanceof ProcessingError) {
      e.addPositionInfo(node.position);
    }
    throw e;
  }
}
/**
 * Function to recursively go through the declaration data type and the intiializer to assign appropriately
 * (and handle zeroing of memory when insufficient intializer exprs are present).
 * Returns byte string of bytes to intialize the memory in the data segment that the declared variabled occupies.
 */
export function unpackDataSegmentInitializerAccordingToDataType(
  dataType: DataType,
  initalizer: Initializer | null,
): string {
  let byteStr = "";
  function helper(
    dataType: DataType,
    initializer: Initializer,
    offset: number,
  ): number {
    if (
      dataType.type === "primary" ||
      dataType.type === "pointer" ||
      dataType.type === "enum"
    ) {
      let scalarDataType: ScalarCDataType;
      if (dataType.type === "pointer") {
        scalarDataType = "pointer";
      } else if (dataType.type === "enum") {
        scalarDataType = ENUM_DATA_TYPE;
      } else {
        scalarDataType = dataType.primaryDataType;
      }
      if (initializer.type === "InitializerSingle") {
        try {
          const processedConstant = evaluateCompileTimeExpression(
            initializer.value,
          );

          byteStr += convertConstantToByteStr(
            processedConstant,
            scalarDataType,
          );
        } catch (e) {
          if (e instanceof ProcessingError) {
            throw new ProcessingError(
              "Initializer element is not compile-time constant",
            );
          }
          throw e;
        }
      } else {
        if (offset >= initializer.values.length) {
          byteStr += getZeroInializerByteStrForDataType(dataType);
        } else {
          // unpack the element at offset of the list until hit a single
          //TODO: perhaps throw warning about braces arnd scalar initializer
          let firstInitializer = initializer.values[offset++];
          while (firstInitializer.type === "InitializerList") {
            if (firstInitializer.values.length === 0) {
              // empty initializer
              byteStr += getZeroInializerByteStrForDataType(dataType);
              return offset;
            }
            firstInitializer = firstInitializer.values[0];
          }
          const processedConstant = evaluateCompileTimeExpression(
            firstInitializer.value,
          );
          byteStr += convertConstantToByteStr(
            processedConstant,
            scalarDataType,
          );
        }
      }
    } else if (dataType.type === "array") {
      if (initializer.type === "InitializerSingle") {
        // TODO: check if this is correct
        throw new ProcessingError("Invalid initializer for aggregate type");
      }
      const numElements = evaluateCompileTimeExpression(
        dataType.numElements,
      ).value;
      for (let i = 0; i < numElements; i++) {
        if (
          dataType.elementDataType.type === "pointer" ||
          dataType.elementDataType.type === "primary"
        ) {
          // same initializer list, offset shld incr by 1
          offset = helper(dataType.elementDataType, initializer, offset);
        } else if (
          dataType.elementDataType.type === "array" ||
          dataType.elementDataType.type === "struct"
        ) {
          if (
            offset >= initializer.values.length ||
            initializer.values[offset].type === "InitializerSingle"
          ) {
            // sub aggregate will take from the same "level" of initalizer list, offset will be incremented
            offset = helper(dataType.elementDataType, initializer, offset);
          } else {
            helper(dataType.elementDataType, initializer.values[offset++], 0); // fresh offset for sub aggregate
          }
        } else if (dataType.elementDataType.type === "function") {
          // should not be possible
          throw new ProcessingError("Cannot have array of functions");
        }
      }
    } else if (dataType.type === "struct") {
      if (initializer.type === "InitializerSingle") {
        // TODO: check if this is correct
        throw new ProcessingError("Invalid initializer for aggregate type");
      }
      for (const field of dataType.fields) {
        if (
          field.dataType.type === "pointer" ||
          field.dataType.type === "primary"
        ) {
          // same initializer list, offset shld incr by 1
          offset = helper(field.dataType, initializer, offset);
        } else if (
          field.dataType.type === "array" ||
          field.dataType.type === "struct"
        ) {
          if (
            offset >= initializer.values.length ||
            initializer.values[offset].type === "InitializerSingle"
          ) {
            // sub aggregate will take from the same "level" of initalizer list, offset will be incremented
            offset = helper(field.dataType, initializer, offset);
          } else {
            helper(field.dataType, initializer.values[offset++], 0); // fresh offset for sub aggregate
          }
        } else if (field.dataType.type === "function") {
          throw new ProcessingError("Function is not valid field of struct");
        }
      }
    } else if (dataType.type === "function") {
      throw new ProcessingError("Cannot initialize function type");
    }
    return offset;
  }

  if (initalizer === null) {
    return getZeroInializerByteStrForDataType(dataType);
  }

  helper(dataType, initalizer, 0);
  return byteStr;
}
