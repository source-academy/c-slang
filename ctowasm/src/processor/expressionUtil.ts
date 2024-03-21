/**
 * Definitions of various utility functions used for processing the C AST expressions.
 */

import {
  BinaryOperator,
  PrimaryCDataType,
  ScalarCDataType,
} from "~src/common/types";

import {
  isFloatType,
  isIntegerType,
  primaryDataTypeSizes,
} from "~src/common/utils";
import { DataType, ScalarDataType } from "~src/parser/c-ast/dataTypes";
import { ExpressionWrapperP } from "~src/processor/c-ast/expression/expressions";
import { ProcessingError } from "~src/errors";
import {
  getDataTypeSize,
  isArithmeticDataType,
  isIntegralDataType,
  isVoidPointer,
  isScalarDataType,
  getIntegerPromotedDataType,
} from "~src/processor/dataTypeUtil";
import {
  PostfixExpression,
  PrefixExpression,
} from "~src/parser/c-ast/expression/unaryExpression";
import { SymbolTable } from "~src/processor/symbolTable";
import processExpression from "~src/processor/processExpression";
import { MemoryLoad, MemoryStore } from "~src/processor/c-ast/memory";
import { getDataTypeOfExpression } from "~src/processor/util";
import { checkPrePostfixTypeConstraint } from "~src/processor/constraintChecks";
import { PTRDIFF_T } from "~src/common/constants";

function isRelationalOperator(op: BinaryOperator) {
  return (
    op === "!=" ||
    op === "<" ||
    op === "<=" ||
    op === "==" ||
    op === ">=" ||
    op === ">"
  );
}

function isLogicalOperator(op: BinaryOperator) {
  return (op === "&&" || op === "||");
}

/**
 * Extracts the ScalarCDataType of a dataType.
 * @throws ProcessingError if the argument is not actually scalar data type.
 */
export function convertDataTypeToScalarCDataType(
  dataType: DataType
): ScalarCDataType {
  if (
    dataType.type !== "pointer" &&
    dataType.type !== "primary" &&
    dataType.type !== "array"
  ) {
    throw new ProcessingError("non scalar data type");
  }
  return dataType.type === "pointer" || dataType.type === "array"
    ? "pointer"
    : dataType.primaryDataType;
}

/**
 * Determine the overall datatype of a ConditionalExpression (e.g. 1 ? 2 : 3).
 * Follows same rules as binary expressions ("+" used as placeholder).
 */
export function determineConditionalExpressionDataType(
  leftExprDataType: ScalarDataType,
  rightExprDataType: ScalarDataType
) {
  const dataType = determineResultDataTypeOfBinaryExpression(
    leftExprDataType,
    rightExprDataType,
    "+"
  );
  return dataType.type === "pointer" ? "pointer" : dataType.primaryDataType;
}

/**
 * Determines the type that operands in a binary expression should be converted to before the operation,
 * according to rules of arithemetic conversion 6.3.1.8 in C17 standard.
 * Follows integer promition rules for integral types. Promotion follows by size of the variable (larger size = higher rank)
 * The data type of all relational operator expressions is signed int, as per the standard.
 */
export function determineOperandTargetDataTypeOfBinaryExpression(
  leftExprDataType: ScalarDataType,
  rightExprDataType: ScalarDataType,
  operator: BinaryOperator
): ScalarDataType {
  // no need to check for validity of operand types, as this will have been checked before the function was called
  // if either data type are pointers, then target data type is pointer (unsigned int)
  // if both are pointer, it can only be a subtraction, in which case the resultant data type is PTRDIFF
  if (leftExprDataType.type === "pointer" && rightExprDataType.type === "pointer") {
    return {
      type: "primary",
      primaryDataType: PTRDIFF_T
    };
  } else if (leftExprDataType.type === "pointer") {
    return leftExprDataType;
  } else if (rightExprDataType.type === "pointer") {
    return rightExprDataType;
  } else {
    return {
      type: "primary",
      primaryDataType: determineOperandTargetDataTypeOfArithmeticExpression(
        leftExprDataType.primaryDataType,
        rightExprDataType.primaryDataType,
        operator
      ),
    };
  }
}

/**
 * Returns the data type of the result of an arithmetic expression between two primary data types.
 */
export function determineResultDataTypeOfArithmeticExpression(
  leftExprDataType: PrimaryCDataType,
  rightExprDataType: PrimaryCDataType,
  operator: BinaryOperator
): PrimaryCDataType {
  if (isRelationalOperator(operator)) {
    return "signed int";
  }
  return determineOperandTargetDataTypeOfArithmeticExpression(
    leftExprDataType,
    rightExprDataType,
    operator
  );
}

export function determineOperandTargetDataTypeOfArithmeticExpression(
  leftExprDataType: PrimaryCDataType,
  rightExprDataType: PrimaryCDataType,
  operator: BinaryOperator
): PrimaryCDataType {
  if (isFloatType(leftExprDataType) && isFloatType(rightExprDataType)) {
    // take more higher ranking float type
    if (
      primaryDataTypeSizes[rightExprDataType] >
      primaryDataTypeSizes[leftExprDataType]
    ) {
      return leftExprDataType;
    } else {
      return rightExprDataType;
    }
  } else if (isFloatType(leftExprDataType)) {
    // float types have greater precedence than any integer types
    return leftExprDataType;
  } else if (isFloatType(rightExprDataType)) {
    return rightExprDataType;
  } else {
    // both types are integers
    // special handling for bitwise shift, which does not follow usual arithmetic implicit conversion rules
    if (operator === "<<" || operator === ">>") {
      return leftExprDataType;
    }

    if (
      primaryDataTypeSizes[rightExprDataType] >
      primaryDataTypeSizes[leftExprDataType]
    ) {
      return rightExprDataType;
    } else {
      return rightExprDataType;
    }
  }
}

/**
 * Returns the correct varaible type for both the result of a binary expression,
 * according to rules of arithemetic conversion 6.3.1.8 in C17 standard.
 * This should be the same as the operand target data type, except for relational operators.
 *
 */
export function determineResultDataTypeOfBinaryExpression(
  leftExprDataType: ScalarDataType,
  rightExprDataType: ScalarDataType,
  operator: BinaryOperator
): ScalarDataType {
  if (isRelationalOperator(operator) || isLogicalOperator(operator)) {
    return {
      type: "primary",
      primaryDataType: "signed int",
    };
  }
  return determineOperandTargetDataTypeOfBinaryExpression(
    leftExprDataType,
    rightExprDataType,
    operator
  );
}

/**
 * Get the MemoryStore and MemoryLoad nodes needed for a increment/decrement of an lvalue of appropriate type.
 */
export function getArithmeticPrePostfixExpressionNodes(
  expr: PrefixExpression | PostfixExpression,
  symbolTable: SymbolTable
): { storeNodes: MemoryStore[]; loadNode: MemoryLoad; dataType: DataType } {
  const binaryOperator = expr.operator === "++" ? "+" : "-";
  const processedExpr = processExpression(expr.expr, symbolTable);
  checkPrePostfixTypeConstraint(expr, processedExpr, symbolTable);
  const dataType = getDataTypeOfExpression({
    expression: processedExpr,
  });

  // do some checks on the operand
  // simply use the load exprs from the processed expr to create the memory store staements
  if (processedExpr.exprs[0].type !== "MemoryLoad") {
    throw new ProcessingError(
      `lvalue required for '${expr.operator}' expression`
    );
  } else if (processedExpr.exprs.length > 1) {
    throw new ProcessingError(
      `'${expr.operator}' expression operand must be a scalar type`
    );
  } else if (isVoidPointer(dataType)) {
    throw new ProcessingError(`cannot perform arithmetic on void pointer`);
  }

  let amountToIncrementBy;
  if (dataType.type === "pointer") {
    amountToIncrementBy = BigInt(
      getDataTypeSize(dataType.pointeeType as DataType)
    );
  } else if (dataType.type === "array") {
    // need increment the underying expression (a pointer) by size of array
    amountToIncrementBy = BigInt(getDataTypeSize(dataType));
  } else {
    amountToIncrementBy = 1n;
  }

  const memoryLoad = processedExpr.exprs[0] as MemoryLoad;
  const memoryStoreNodes: MemoryStore[] = [
    {
      type: "MemoryStore",
      address: memoryLoad.address,
      value: {
        type: "BinaryExpression",
        leftExpr: memoryLoad,
        rightExpr: {
          type: "IntegerConstant",
          value: amountToIncrementBy,
          dataType: "signed int",
        },
        dataType: memoryLoad.dataType,
        operandTargetDataType: memoryLoad.dataType,
        operator: binaryOperator,
      },
      dataType: memoryLoad.dataType,
    },
  ];

  return {
    loadNode: memoryLoad,
    storeNodes: memoryStoreNodes,
    dataType,
  };
}

export function processPrefixExpression(
  prefixExpression: PrefixExpression,
  symbolTable: SymbolTable
): ExpressionWrapperP {
  if (
    prefixExpression.operator === "++" ||
    prefixExpression.operator === "--"
  ) {
    const { loadNode, storeNodes, dataType } =
      getArithmeticPrePostfixExpressionNodes(prefixExpression, symbolTable);
    return {
      originalDataType: dataType,
      exprs: [
        {
          type: "PreStatementExpression",
          statements: storeNodes,
          expr: loadNode,
          dataType: loadNode.dataType,
        },
      ],
    };
  } else {
    const processedExpression = processExpression(
      prefixExpression.expr,
      symbolTable
    );
    const dataType = getDataTypeOfExpression({
      expression: processedExpression,
    });
    // check constraints for each opeartor as per 6.5.3.3/1 of C standard
    if (
      (prefixExpression.operator === "+" ||
        prefixExpression.operator === "-") &&
      !isArithmeticDataType(dataType)
    ) {
      throw new ProcessingError(
        `wrong type argument to unary '${prefixExpression.operator}' expression; arithmetic type required`
      );
    } else if (
      prefixExpression.operator === "~" &&
      !isIntegralDataType(dataType)
    ) {
      throw new ProcessingError(
        `wrong type argument in unary '${prefixExpression.operator}' expression; integer type required`
      );
    } else if (
      prefixExpression.operator === "!" &&
      !isScalarDataType(dataType)
    ) {
      throw new ProcessingError(
        `wrong type argument in unary '${prefixExpression.operator}' expression; scalar type required`
      );
    }

    if (prefixExpression.operator === "+") {
      // "+" does nothing except integer promotion
      processedExpression.originalDataType = getIntegerPromotedDataType(
        processedExpression.originalDataType
      );
      return processedExpression;
    } else {
      let resultDataType: DataType;
      switch (prefixExpression.operator) {
        case "-":
        case "~":
          resultDataType = getIntegerPromotedDataType(
            processedExpression.originalDataType
          );
          break;
        case "!":
          resultDataType = {
            type: "primary",
            primaryDataType: "signed int",
          };
      }
      return {
        originalDataType: resultDataType,
        exprs: [
          {
            type: "UnaryExpression",
            operator: prefixExpression.operator,
            expr: processedExpression.exprs[0],
            dataType: processedExpression.exprs[0].dataType,
          },
        ],
      };
    }
  }
}

export function processPostfixExpression(
  postfixExpression: PostfixExpression,
  symbolTable: SymbolTable
): ExpressionWrapperP {
  const { loadNode, storeNodes, dataType } =
    getArithmeticPrePostfixExpressionNodes(postfixExpression, symbolTable);
  return {
    originalDataType: dataType,
    exprs: [
      {
        type: "PostStatementExpression",
        statements: storeNodes,
        expr: loadNode,
        dataType: loadNode.dataType,
      },
    ],
  };
}
