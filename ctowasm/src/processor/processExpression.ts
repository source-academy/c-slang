/**
 * Definition of function to process Expression expr s.
 */

import { ProcessingError, UnsupportedFeatureError } from "~src/errors";
import { Expression } from "~src/parser/c-ast/core";
import { ExpressionWrapperP } from "~src/processor/c-ast/expression/expressions";
import {
  FunctionReturnMemoryLoad,
  MemoryLoad,
} from "~src/processor/c-ast/memory";
import {
  checkBinaryExpressionDataTypesValidity,
  determineOperandTargetDataTypeOfBinaryExpression,
  determineResultDataTypeOfBinaryExpression,
  processPostfixExpression,
  processPrefixExpression,
} from "~src/processor/expressionUtil";
import { FunctionSymbolEntry, SymbolTable } from "~src/processor/symbolTable";
import {
  createMemoryOffsetIntegerConstant,
  getDataTypeOfExpression,
} from "~src/processor/util";
import { convertFunctionCallToFunctionCallP } from "./processFunctionDefinition";
import { getAssignmentNodes } from "~src/processor/lvalueUtil";
import {
  determineIndexAndDataTypeOfFieldInStruct,
  getDataTypeSize,
  isScalarDataType,
  unpackDataType,
} from "~src/processor/dataTypeUtil";
import { IntegerDataType } from "~src/common/types";
import processConstant from "~src/processor/processConstant";
import { PTRDIFF_T, SIZE_T } from "~src/common/constants";
import { DataType, ScalarDataType } from "~src/parser/c-ast/dataTypes";
import { getSizeOfScalarDataType } from "~src/common/utils";

/**
 * Processes an Expression node in the context where value(s) are expected to be loaded from memory for use in a statement (action).
 */
export default function processExpression(
  expr: Expression,
  symbolTable: SymbolTable
): ExpressionWrapperP {
  try {
    if (expr.type === "Assignment") {
      const { memoryStoreStatements, memoryLoadExpressions, dataType } = getAssignmentNodes(expr, symbolTable);

      return {
        originalDataType: dataType,
        exprs: [
          // first expr has all the assignment nodes TODO: see if any better way
          {
            type: "PreStatementExpression",
            statements: memoryStoreStatements,
            expr: memoryLoadExpressions[0],
            dataType: memoryLoadExpressions[0].dataType,
          },
          ...memoryLoadExpressions.slice(1),
        ],
      };
    } else if (expr.type === "BinaryExpression") {
      const processedLeftExpr = processExpression(expr.leftExpr, symbolTable);
      const processedLeftExprDataType = getDataTypeOfExpression({
        expression: processedLeftExpr,
        convertArrayToPointer: true,
      });
      const processedRightExpr = processExpression(expr.rightExpr, symbolTable);
      const processedRightExprDataType = getDataTypeOfExpression({
        expression: processedRightExpr,
        convertArrayToPointer: true,
      });

      // Future work: add more specific type checking for binray expressions with different operators
      if (
        !isScalarDataType(processedLeftExprDataType) ||
        !isScalarDataType(processedRightExprDataType)
      ) {
        throw new ProcessingError(
          `Non-scalar operand to ${expr.operator} binary expression: left operand: ${processedLeftExprDataType.type}, right operand: ${processedRightExprDataType.type}`
        );
      }

      if (
        processedLeftExpr.exprs.length > 1 ||
        processedRightExpr.exprs.length > 1
      ) {
        throw new ProcessingError(
          "Aggregate expressions cannot be used in binary expressions",
          expr.position
        );
      }

      try {
        checkBinaryExpressionDataTypesValidity(
          processedLeftExprDataType,
          processedRightExprDataType,
          expr.operator
        );
      } catch (e) {
        if (e instanceof ProcessingError) {
          e.addPositionInfo(expr.position);
          throw e;
        }
        throw e;
      }

      const binaryExpressionDataType =
        determineResultDataTypeOfBinaryExpression(
          processedLeftExprDataType as ScalarDataType, // already checked that is scalar in checkBinaryExpressionDataTypesValidity
          processedRightExprDataType as ScalarDataType,
          expr.operator
        );

      const operandTargetDataType =
        determineOperandTargetDataTypeOfBinaryExpression(
          processedLeftExprDataType as ScalarDataType, // already checked that is scalar in checkBinaryExpressionDataTypesValidity
          processedRightExprDataType as ScalarDataType,
          expr.operator
        );

      let leftExpr = processedLeftExpr.exprs[0];
      let rightExpr = processedRightExpr.exprs[0];

      // account for pointer type arithmetic - already checked that it must be '+' or '-' in determineDataTypeOfBinaryExpression
      if (
        processedLeftExprDataType.type === "pointer" &&
        processedRightExprDataType.type === "primary"
      ) {
        rightExpr = {
          type: "BinaryExpression",
          operator: "*",
          leftExpr: rightExpr,
          rightExpr: {
            type: "IntegerConstant",
            value: BigInt(
              getDataTypeSize(processedLeftExprDataType.pointeeType as DataType)
            ), // void pointer already checked for
            dataType: rightExpr.dataType as IntegerDataType, // datatype is confirmed by determineDataTypeOfBinaryExpression
          },
          dataType: rightExpr.dataType,
          operandTargetDataType: rightExpr.dataType,
        };
      } else if (
        processedRightExprDataType.type === "pointer" &&
        processedLeftExprDataType.type === "primary"
      ) {
        leftExpr = {
          type: "BinaryExpression",
          operator: "*",
          leftExpr: leftExpr,
          rightExpr: {
            type: "IntegerConstant",
            value: BigInt(
              getDataTypeSize(
                processedRightExprDataType.pointeeType as DataType
              )
            ),
            dataType: leftExpr.dataType as IntegerDataType, // datatype is confirmed by determineDataTypeOfBinaryExpression
          },
          dataType: leftExpr.dataType,
          operandTargetDataType: leftExpr.dataType,
        };
      }

      if (
        processedRightExprDataType.type === "pointer" &&
        processedLeftExprDataType.type === "pointer" &&
        expr.operator === "-"
      ) {
        // special handling for subtraction between pointers, need to divide result by underlying type size
        return {
          originalDataType: binaryExpressionDataType,
          exprs: [
            {
              type: "BinaryExpression",
              leftExpr: {
                type: "BinaryExpression",
                leftExpr,
                rightExpr,
                operator: expr.operator,
                dataType:
                  binaryExpressionDataType.type === "pointer"
                    ? "pointer"
                    : binaryExpressionDataType.primaryDataType,
                operandTargetDataType: "pointer",
              },
              operator: "/",
              rightExpr: {
                type: "IntegerConstant",
                value: BigInt(
                  getDataTypeSize(
                    processedRightExprDataType.pointeeType as DataType
                  )
                ),
                dataType: PTRDIFF_T,
              },
              dataType: PTRDIFF_T,
              operandTargetDataType: PTRDIFF_T,
            },
          ],
        };
      }

      return {
        originalDataType: binaryExpressionDataType,
        exprs: [
          {
            type: "BinaryExpression",
            leftExpr,
            rightExpr,
            operator: expr.operator,
            dataType:
              binaryExpressionDataType.type === "pointer"
                ? "pointer"
                : binaryExpressionDataType.primaryDataType,
            operandTargetDataType:
              operandTargetDataType.type === "pointer"
                ? "pointer"
                : operandTargetDataType.primaryDataType,
          },
        ],
      };
    } else if (
      expr.type === "IntegerConstant" ||
      expr.type === "FloatConstant"
    ) {
      const processedConstant = processConstant(expr);
      return {
        originalDataType: {
          type: "primary",
          primaryDataType: processedConstant.dataType,
        },
        exprs: [processedConstant],
      };
    } else if (expr.type === "FunctionCall") {
      const functionCallStatement = convertFunctionCallToFunctionCallP(
        expr,
        symbolTable
      );

      let funcReturnType;
      if (expr.expr.type === "IdentifierExpression") {
        const symbolEntry = symbolTable.getSymbolEntry(
          expr.expr.name
        ) as FunctionSymbolEntry;

        funcReturnType = symbolEntry.dataType.returnType;
        if (funcReturnType === null) {
          throw new ProcessingError(
            `Function ${expr.expr} does not return anything, but is used as expression`
          );
        }
      } else {
        // TODO: add return type check for function pointer
        throw new UnsupportedFeatureError("Function pointer not supported.");
      }

      // start curr offset at negative of the size of the return obj
      let currOffset = -getDataTypeSize(funcReturnType);
      const returnObjectMemoryLoads: FunctionReturnMemoryLoad[] = [];

      unpackDataType(funcReturnType).forEach((returnObj) => {
        returnObjectMemoryLoads.push({
          type: "FunctionReturnMemoryLoad",
          offset: createMemoryOffsetIntegerConstant(currOffset),
          dataType: returnObj.dataType,
        });
        currOffset += returnObj.offset;
      });

      // regardless of return type, all function call expression have a preStatementExpression
      return {
        originalDataType: funcReturnType,
        exprs: [
          {
            type: "PreStatementExpression",
            // run function call before loading return values
            statements: [functionCallStatement],
            dataType: returnObjectMemoryLoads[0].dataType,
            expr: returnObjectMemoryLoads[0],
          },
        ],
      };
    } else if (expr.type === "PrefixExpression") {
      return processPrefixExpression(expr, symbolTable);
    } else if (expr.type === "PostfixExpression") {
      return processPostfixExpression(expr, symbolTable);
    } else if (expr.type === "IdentifierExpression") {
      const symbolEntry = symbolTable.getSymbolEntry(expr.name);
      if (!symbolEntry) {
        throw new ProcessingError(`'${expr.name}' undeclared`);
      }

      if (symbolEntry.type === "function") {
        // TODO: to handle when function pointers supported
        throw new UnsupportedFeatureError(
          "Function pointers not supported yet"
        );
      }

      if (symbolEntry.dataType.type === "array") {
        // arrays are treated as pointer
        return {
          originalDataType: symbolEntry.dataType,
          exprs: [
            {
              type:
                symbolEntry.type === "globalVariable"
                  ? "DataSegmentAddress"
                  : "LocalAddress",
              offset: createMemoryOffsetIntegerConstant(symbolEntry.offset),
              dataType: "pointer",
            },
          ],
        };
      } else if (symbolEntry.dataType.type === "function") {
        // TODO: when function pointer ssupported
        throw new UnsupportedFeatureError("function pointer");
      } else {
        const unpackedDataType = unpackDataType(symbolEntry.dataType);
        return {
          originalDataType: symbolEntry.dataType,
          exprs: unpackedDataType.map((primaryDataObject) => ({
            type: "MemoryLoad",
            address: {
              type:
                symbolEntry.type === "globalVariable"
                  ? "DataSegmentAddress"
                  : "LocalAddress",
              offset: createMemoryOffsetIntegerConstant(
                symbolEntry.offset + primaryDataObject.offset
              ),
              dataType: "pointer",
            },
            dataType: primaryDataObject.dataType,
          })),
        };
      }
    } else if (expr.type === "AddressOfExpression") {
      if (expr.expr.type === "IdentifierExpression") {
        // taking the address of a symbol - could be a variable or function
        const identifier = expr.expr.name;
        const symbolEntry = symbolTable.getSymbolEntry(identifier);
        if (symbolEntry.type === "function") {
          //TODO: support function pointrs
          throw new UnsupportedFeatureError(
            "Function pointers not yet supported"
          );
        }
        // TODO: need to handle struct -> .
        return {
          originalDataType: {
            type: "pointer",
            pointeeType: symbolEntry.dataType,
          },
          exprs: [
            {
              type:
                symbolEntry.type === "globalVariable"
                  ? "DataSegmentAddress"
                  : "LocalAddress",
              offset: createMemoryOffsetIntegerConstant(symbolEntry.offset),
              dataType: "pointer",
            },
          ],
        };
      } else if (expr.expr.type === "PointerDereference") {
        return processExpression(expr.expr.expr, symbolTable); // simply return the expression within the deref expression (& cancels *)
      } else {
        throw new ProcessingError("lvalue required for unary '&' operand");
      }
    } else if (expr.type === "PointerDereference") {
      // process the expression being dereferenced first
      const derefedExpression = processExpression(expr.expr, symbolTable);
      const derefedExpressionDataType = getDataTypeOfExpression({
        expression: derefedExpression,
        convertArrayToPointer: true,
      });

      if (derefedExpressionDataType.type !== "pointer") {
        throw new ProcessingError(`Cannot dereference non-pointer type`);
      }

      if (derefedExpressionDataType.pointeeType === null) {
        throw new ProcessingError(`Cannot dereference void pointer`);
      }

      if (
        derefedExpressionDataType.pointeeType.type === "primary" ||
        derefedExpressionDataType.pointeeType.type === "pointer"
      ) {
        return {
          originalDataType: derefedExpressionDataType.pointeeType,
          exprs: [
            {
              type: "MemoryLoad",
              address: {
                type: "DynamicAddress",
                address: derefedExpression.exprs[0],
                dataType: "pointer",
              },
              dataType:
                derefedExpressionDataType.pointeeType.type === "pointer"
                  ? "pointer"
                  : derefedExpressionDataType.pointeeType.primaryDataType,
            },
          ],
        };
      } else if (derefedExpressionDataType.pointeeType.type === "array") {
        // the resultant data type of the whole dereference expression should be pointer to the array element type, as arrays are treated as pointers
        return {
          originalDataType: derefedExpressionDataType.pointeeType,
          exprs: [
            {
              type: "DynamicAddress",
              address: derefedExpression.exprs[0],
              dataType: "pointer",
            },
          ],
        };
      } else {
        const unpackedStruct = unpackDataType(
          derefedExpressionDataType.pointeeType
        );
        return {
          originalDataType: derefedExpressionDataType.pointeeType,
          exprs: unpackedStruct.map((primaryDataObject) => ({
            type: "MemoryLoad",
            address: {
              type: "DynamicAddress",
              address: {
                type: "BinaryExpression",
                leftExpr: derefedExpression.exprs[0], // value of dereferenced expression (starting address of the pointed to struct)
                rightExpr: createMemoryOffsetIntegerConstant(
                  primaryDataObject.offset
                ), // offset of particular primary data object in struct
                operator: "+",
                operandTargetDataType: "pointer",
                dataType: "pointer",
              },
              dataType: "pointer",
            },
            dataType: primaryDataObject.dataType,
          })),
        };
      }
    } else if (expr.type === "SizeOfExpression") {
      let dataTypeToGetSizeOf;
      if (expr.subtype === "expression") {
        // sizeof used on expression
        dataTypeToGetSizeOf = processExpression(
          expr.expr,
          symbolTable
        ).originalDataType;
      } else {
        // sizeof used on datatype
        dataTypeToGetSizeOf = expr.dataType;
      }

      return {
        originalDataType: {
          type: "primary",
          primaryDataType: SIZE_T,
        },
        exprs: [
          {
            type: "IntegerConstant",
            value: BigInt(getDataTypeSize(dataTypeToGetSizeOf)),
            dataType: SIZE_T,
          },
        ],
      };
    } else if (expr.type === "StructMemberAccess") {
      const processedExpr = processExpression(expr.expr, symbolTable); // process the underlying expression being operated on
      const dataTypeOfExpr = getDataTypeOfExpression({
        expression: processedExpr,
      });
      if (dataTypeOfExpr.type !== "struct") {
        throw new ProcessingError(
          `request for member '${expr.fieldTag}' in something that is not a structure or union`
        );
      }
      const { fieldIndex, fieldDataType } =
        determineIndexAndDataTypeOfFieldInStruct(dataTypeOfExpr, expr.fieldTag);

      if (fieldDataType.type === "array") {
        // treat array field as just a pointer
        return {
          originalDataType: {
            type: "pointer",
            pointeeType: fieldDataType.elementDataType,
          },
          exprs: [
            {
              type: "DynamicAddress",
              address: processedExpr.exprs[fieldIndex],
              dataType: "pointer",
            },
          ],
        };
      } else if (fieldDataType.type === "function") {
        // TODO: handle function pointer in future
        throw new UnsupportedFeatureError(
          "Function pointers not yet supported"
        );
      } else {
        // procssedExpr already consists of accessing the whole struct (all primary memory object loads)
        // just use field index to access the right ones
        const memoryLoadExprs: MemoryLoad[] = [];
        let totalBytesLoaded = 0;
        let currLoadIndex = fieldIndex;
        while (totalBytesLoaded < getDataTypeSize(fieldDataType)) {
          if (processedExpr.exprs[currLoadIndex].type !== "MemoryLoad") {
            // only "MemoryLoads" can possibly indicate an lvalue
            throw new ProcessingError(
              `request for member '${expr.fieldTag}' in something that is not a structure or union`
            );
          }
          totalBytesLoaded += getSizeOfScalarDataType(
            (processedExpr.exprs[currLoadIndex] as MemoryLoad).dataType
          );
          memoryLoadExprs.push(
            processedExpr.exprs[currLoadIndex++] as MemoryLoad
          );
        }
        return {
          originalDataType: fieldDataType,
          exprs: memoryLoadExprs,
        };
      }
    } else {
      // this should not happen
      throw new ProcessingError("Unhandled Expression");
    }
  } catch (e) {
    if (e instanceof ProcessingError) {
      e.addPositionInfo(expr.position);
    }
    throw e;
  }
}
