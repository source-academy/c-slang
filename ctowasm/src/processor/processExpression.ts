/**
 * Definition of function to process Expression expr s.
 */

import { ProcessingError, UnsupportedFeatureError, toJson } from "~src/errors";
import { Expression } from "~src/parser/c-ast/core";
import { ExpressionWrapperP } from "~src/processor/c-ast/expression/expressions";
import { FunctionReturnMemoryLoad } from "~src/processor/c-ast/memory";
import {
  determineDataTypeOfBinaryExpression,
  getDerefExpressionMemoryDetails,
  processPostfixExpression,
  processPrefixExpression,
} from "~src/processor/expressionUtil";
import { FunctionSymbolEntry, SymbolTable } from "~src/processor/symbolTable";
import { createMemoryOffsetIntegerConstant } from "~src/processor/util";
import {
  convertFunctionCallToFunctionCallP,
} from "./processFunctionDefinition";
import { getAssignmentMemoryStoreNodes } from "~src/processor/lvalueUtil";
import processBlockItem from "~src/processor/processBlockItem";
import {
  getDataTypeSize,
  isScalarType,
  unpackDataType,
} from "~src/processor/dataTypeUtil";
import { IntegerDataType } from "~src/common/types";
import processConstant from "~src/processor/processConstant";
import { SIZE_OF_EXPR_RESULT_DATA_TYPE } from "~src/common/constants";

/**
 * Processes an Expression node in the context where value(s) are expected to be loaded from memory for use in a statement (action).
 */
export default function processExpression(
  expr: Expression,
  symbolTable: SymbolTable
): ExpressionWrapperP {
  try {
    if (expr.type === "Assignment") {
      // handle assignment
      const assignmentNodes = getAssignmentMemoryStoreNodes(expr, symbolTable);

      // visit the expresion being assigned to, get the memory load instructions
      const processedExpr = processExpression(expr, symbolTable);

      return {
        originalDataType: processedExpr.originalDataType,
        exprs: [
          // first expr has all the assignment nodes TODO: see if any better way
          {
            type: "PreStatementExpression",
            statements: assignmentNodes,
            expr: processedExpr.exprs[0],
            dataType: processedExpr.exprs[0].dataType,
          },
          ...processedExpr.exprs.slice(1),
        ],
      };
    } else if (expr.type === "BinaryExpression") {
      const processedLeftExpr = processExpression(expr.leftExpr, symbolTable);
      const processedRightExpr = processExpression(expr.rightExpr, symbolTable);

      // Future work: add more specific type checking for binray expressions with different operators
      if (
        !isScalarType(processedLeftExpr.originalDataType) ||
        !isScalarType(processedRightExpr.originalDataType)
      ) {
        throw new ProcessingError(
          `Non-scalar operand to ${expr.operator} binary expression`
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

      let binaryExpressionDataType;
      try {
        binaryExpressionDataType = determineDataTypeOfBinaryExpression(
          // this function may throw some errors to do with binary expression constraint checks
          processedLeftExpr.originalDataType,
          processedRightExpr.originalDataType,
          expr.operator
        );
      } catch (e) {
        if (e instanceof ProcessingError) {
          e.addPositionInfo(expr.position);
          throw e;
        }
        throw e;
      }

      let leftExpr = processedLeftExpr.exprs[0];
      let rightExpr = processedRightExpr.exprs[0];

      // account for pointer type arithmetic - already checked that it must be '+' or '-' determineDataTypeOfBinaryExpression
      if (
        processedLeftExpr.originalDataType.type === "pointer" &&
        processedRightExpr.originalDataType.type === "primary"
      ) {
        rightExpr = {
          type: "BinaryExpression",
          operator: "*",
          leftExpr: rightExpr,
          rightExpr: {
            type: "IntegerConstant",
            value: BigInt(getDataTypeSize(processedLeftExpr.originalDataType)),
            dataType: rightExpr.dataType as IntegerDataType, // datatype is confirmed by determineDataTypeOfBinaryExpression
          },
          dataType: rightExpr.dataType,
        };
      } else if (
        processedRightExpr.originalDataType.type === "pointer" &&
        processedLeftExpr.originalDataType.type === "primary"
      ) {
        leftExpr = {
          type: "BinaryExpression",
          operator: "*",
          leftExpr: leftExpr,
          rightExpr: {
            type: "IntegerConstant",
            value: BigInt(getDataTypeSize(processedRightExpr.originalDataType)),
            dataType: leftExpr.dataType as IntegerDataType, // datatype is confirmed by determineDataTypeOfBinaryExpression
          },
          dataType: leftExpr.dataType,
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

      if (
        symbolEntry.dataType.type === "primary" ||
        symbolEntry.dataType.type === "pointer"
      ) {
        return {
          originalDataType: symbolEntry.dataType,
          exprs: [
            {
              type: "MemoryLoad",
              address: {
                type:
                  symbolEntry.type === "globalVariable"
                    ? "DataSegmentAddress"
                    : "LocalAddress",
                offset: createMemoryOffsetIntegerConstant(symbolEntry.offset),
                dataType:
                  symbolEntry.dataType.type === "primary"
                    ? symbolEntry.dataType.primaryDataType
                    : "pointer",
              },
              dataType:
                symbolEntry.dataType.type === "primary"
                  ? symbolEntry.dataType.primaryDataType
                  : "pointer",
            },
          ],
        };
      } else if (symbolEntry.dataType.type === "array") {
        // arrays are treated as pointer
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
      } else if (symbolEntry.dataType.type === "struct") {
        // TODO: structs
        throw new UnsupportedFeatureError("Structs not yet supported");
      } else {
        throw new ProcessingError("Unknown data type");
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
        return processExpression(expr.expr, symbolTable); // simply return the processed dereferenced expression (& cancels *)
      } else {
        throw new ProcessingError("lvalue required for unary '&' operand");
      }
    } else if (expr.type === "PointerDereference") {
      const { originalDataType, primaryMemoryObjectDetails } =
        getDerefExpressionMemoryDetails(expr, symbolTable);
      return {
        originalDataType,
        exprs: primaryMemoryObjectDetails.map((memObj) => ({
          type: "MemoryLoad",
          address: memObj.address,
          dataType: memObj.dataType,
        })),
      };
    } else if (expr.type === "SizeOfExpression") {
      const exprDataType = processExpression(
        expr.expr,
        symbolTable
      ).originalDataType;
      return {
        originalDataType: {
          type: "primary",
          primaryDataType: SIZE_OF_EXPR_RESULT_DATA_TYPE,
        },
        exprs: [
          {
            type: "IntegerConstant",
            value: BigInt(getDataTypeSize(exprDataType)),
            dataType: SIZE_OF_EXPR_RESULT_DATA_TYPE,
          },
        ],
      };
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
