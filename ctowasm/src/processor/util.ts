/**
 * Definitions of various utility functions.
 */

import { SymbolTable } from "~src/processor/symbolTable";
import { ProcessingError } from "~src/errors";
import { Expression } from "~src/parser/c-ast/core";
import processExpression from "~src/processor/processExpression";
import { IntegerConstantP } from "~src/processor/c-ast/expression/constants";
import { getDecayedArrayPointerType, isScalarDataType } from "~src/processor/dataTypeUtil";
import {
  DataType,
  FunctionDataType,
  PointerDataType,
} from "~src/parser/c-ast/dataTypes";
import { ExpressionWrapperP } from "~src/processor/c-ast/expression/expressions";
import { PTRDIFF_T } from "~src/common/constants";

export function processCondition(
  condition: Expression,
  symbolTable: SymbolTable,
) {
  const processedCondition = processExpression(condition, symbolTable);
  const dataTypeOfConditionExpression = getDataTypeOfExpression({
    expression: processedCondition,
    convertArrayToPointer: true,
  });
  if (!isScalarDataType(dataTypeOfConditionExpression)) {
    throw new ProcessingError(
      `Cannot use ${dataTypeOfConditionExpression.type} where scalar is required`,
    );
  }
  return processedCondition.exprs[0];
}

export function createMemoryOffsetIntegerConstant(
  offset: number,
): IntegerConstantP {
  return {
    type: "IntegerConstant",
    dataType: PTRDIFF_T,
    value: BigInt(offset),
  };
}

/**
 * Retrieves the DataType of the processed expression. This should be same as the originalDataType field of ExpressionWrapperP, except in the case
 * when @param convertArrayToPointer is set to true, in which case any originalDataType that is array should be converted to pointer.
 */
export function getDataTypeOfExpression({
  expression,
  convertArrayToPointer,
}: {
  expression: ExpressionWrapperP;
  convertArrayToPointer?: boolean;
}): DataType {
  if (convertArrayToPointer && expression.originalDataType.type === "array") {
    getDecayedArrayPointerType(expression.originalDataType);
  }
  return expression.originalDataType;
}

export function createFunctionTableIndexExpressionWrapper(
  functionName: string,
  functionDataType: FunctionDataType,
  symbolTable: SymbolTable,
): ExpressionWrapperP {
  const indexInFunctionTable = symbolTable.getFunctionIndex(functionName);
  return {
    originalDataType: {
      type: "pointer",
      pointeeType: functionDataType,
    },
    exprs: [
      {
        type: "FunctionTableIndex",
        index: createMemoryOffsetIntegerConstant(indexInFunctionTable),
        dataType: "pointer",
      },
    ],
  };
}

export function isFunctionPointer(dataType: DataType) {
  return (
    dataType.type === "pointer" &&
    dataType.pointeeType !== null &&
    dataType.pointeeType.type === "function"
  );
}

/**
 * Extracts the FunctionDataType from a dataType which is a pointer to a function
 */
export function extractFunctionDataTypeFromFunctionPointer(
  dataType: DataType,
): FunctionDataType {
  if (!isFunctionPointer(dataType)) {
    throw new ProcessingError(
      "Called object is not a function or function pointer",
    );
  }

  return (dataType as PointerDataType).pointeeType as FunctionDataType;
}
