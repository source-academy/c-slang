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

/**
 * Checks that a given binary expression is valid based on the data types of operands and the operator used.
 */
export function checkBinaryExpressionDataTypesValidity(
  leftExprDataType: DataType,
  rightExprDataType: DataType,
  operator: BinaryOperator,
) {
  if (
    !isScalarDataType(leftExprDataType) ||
    !isScalarDataType(rightExprDataType)
  ) {
    throw new ProcessingError(
      `'${operator}' expression cannot be performed on non-scalar type`,
    );
  }

  leftExprDataType = leftExprDataType as ScalarDataType;
  rightExprDataType = rightExprDataType as ScalarDataType;

  if (
    leftExprDataType.type === "pointer" &&
    rightExprDataType.type === "pointer"
  ) {
    if (
      leftExprDataType.pointeeType === null ||
      rightExprDataType.pointeeType === null
    ) {
      throw new ProcessingError("cannot perform arithmetic on void pointer");
    }
    if (operator !== "-" && !isRelationalOperator(operator)) {
      throw new ProcessingError(
        `cannot perform '${operator}' binary operation on 2 pointer type operands'`,
      );
    }
  } else if (leftExprDataType.type === "pointer") {
    if (leftExprDataType.pointeeType === null) {
      throw new ProcessingError("cannot perform arithmetic on void pointer");
    }
    if (operator !== "+" && operator !== "-") {
      throw new ProcessingError(
        `cannot perform '${operator}' binary operation on pointer and non-pointer type`,
      );
    }
    if (!isIntegralDataType(rightExprDataType)) {
      throw new ProcessingError(
        `cannot perform '${operator}' binary operation on pointer and non-integral type`,
      );
    }
  } else if (rightExprDataType.type === "pointer") {
    if (rightExprDataType.pointeeType === null) {
      throw new ProcessingError("cannot perform arithmetic on void pointer");
    }
    if (operator !== "+" && operator !== "-") {
      throw new ProcessingError(
        `cannot perform '${operator}' binary operation on pointer and non-pointer type`,
      );
    }
    if (!isIntegralDataType(leftExprDataType)) {
      throw new ProcessingError(
        `cannot perform '${operator}' binary operation on pointer and non-integral type`,
      );
    }
  } else {
    // TODO: add more data type checks here in future
  }
}

/**
 * Extracts the ScalarCDataType of a dataType.
 * @throws ProcessingError if the argument is not actually scalar data type.
 */
export function convertDataTypeToScalarCDataType(
  dataType: DataType,
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
  rightExprDataType: ScalarDataType,
) {
  const dataType = determineResultDataTypeOfBinaryExpression(
    leftExprDataType,
    rightExprDataType,
    "+",
  );
  return dataType.type === "pointer" ? "pointer" : dataType.primaryDataType;
}

/**
 * Determines the type that operands in a binary expression should be converted to before the operation,
 * according to rules of arithemetic conversion 6.3.1.8 in C17 standard.
 * Follows integer promition rules for integral types. Promotion follows by size of the variable (larger size = higher rank)
 *  The data type of all relational operator expressions is signed int, as per the standard.
 */
export function determineOperandTargetDataTypeOfBinaryExpression(
  leftExprDataType: ScalarDataType,
  rightExprDataType: ScalarDataType,
  operator: BinaryOperator,
): ScalarDataType {
  // if either data type are pointers, then target data type is pointer TODO: check this
  if (leftExprDataType.type === "pointer") {
    return leftExprDataType;
  } else if (rightExprDataType.type === "pointer") {
    return rightExprDataType;
  } else {
    return {
      type: "primary",
      primaryDataType: determineOperandTargetDataTypeOfArithmeticExpression(
        leftExprDataType.primaryDataType,
        rightExprDataType.primaryDataType,
        operator,
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
  operator: BinaryOperator,
): PrimaryCDataType {
  if (isRelationalOperator(operator)) {
    return "signed int";
  }
  return determineOperandTargetDataTypeOfArithmeticExpression(
    leftExprDataType,
    rightExprDataType,
    operator,
  );
}

export function determineOperandTargetDataTypeOfArithmeticExpression(
  leftExprDataType: PrimaryCDataType,
  rightExprDataType: PrimaryCDataType,
  operator: BinaryOperator,
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
  operator: BinaryOperator,
): ScalarDataType {
  if (isRelationalOperator(operator)) {
    return {
      type: "primary",
      primaryDataType: "signed int",
    };
  }
  return determineOperandTargetDataTypeOfBinaryExpression(
    leftExprDataType,
    rightExprDataType,
    operator,
  );
}

/**
 * Get the MemoryStore and MemoryLoad nodes needed for a increment/decrement of an lvalue of appropriate type.
 */
export function getArithmeticPrePostfixExpressionNodes(
  expr: PrefixExpression | PostfixExpression,
  symbolTable: SymbolTable,
): { storeNodes: MemoryStore[]; loadNode: MemoryLoad; dataType: DataType } {
  const binaryOperator = expr.operator === "++" ? "+" : "-";
  const processedExpr = processExpression(expr.expr, symbolTable);
  checkPrePostfixTypeConstraint(expr, processedExpr);
  const dataType = getDataTypeOfExpression({
    expression: processedExpr
  });

  // do some checks on the operand
  // simply use the load exprs from the processed expr to create the memory store staements
  if (processedExpr.exprs[0].type !== "MemoryLoad") {
    throw new ProcessingError(
      `lvalue required for '${expr.operator}' expression`,
    );
  } else if (processedExpr.exprs.length > 1) {
    throw new ProcessingError(
      `'${expr.operator}' expression operand must be a scalar type`,
    );
  } else if (isVoidPointer(dataType)) {
    throw new ProcessingError(`cannot perform arithmetic on void pointer`);
  }

  let amountToIncrementBy;
  if (dataType.type === "pointer") {
    amountToIncrementBy = BigInt(
      getDataTypeSize(dataType.pointeeType as DataType),
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
  symbolTable: SymbolTable,
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
      symbolTable,
    );

    // check constraints for each opeartor as per 6.5.3.3 of C standard
    if (
      (prefixExpression.operator === "+" ||
        prefixExpression.operator === "-") &&
      !isArithmeticDataType(processedExpression.originalDataType)
    ) {
      throw new ProcessingError(
        `arithmetic operand required in prefix '${prefixExpression.operator}' expression`,
      );
    } else if (
      prefixExpression.operator === "~" &&
      (processedExpression.originalDataType.type !== "primary" ||
        !isIntegerType(processedExpression.originalDataType.primaryDataType))
    ) {
      throw new ProcessingError(
        `integer-type operand required in prefix '${prefixExpression.operator}' expression`,
      );
    } else if (
      prefixExpression.operator === "!" &&
      !isScalarDataType(processedExpression.originalDataType)
    ) {
      throw new ProcessingError(
        `scalar operand required in prefix '${prefixExpression.operator}' expression`,
      );
    }

    if (prefixExpression.operator === "+") {
      // "+" does nothing
      return processedExpression;
    } else {
      return {
        originalDataType: processedExpression.originalDataType,
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
  symbolTable: SymbolTable,
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
