/**
 * Definitions of various utility functions used for processing the C AST expressions.
 */

import { BinaryOperator, ScalarCDataType } from "~src/common/types";

import {
  isFloatType,
  isIntegerType,
  primaryDataTypeSizes,
} from "~src/common/utils";
import {
  DataType,
  PointerDataType,
  PrimaryDataType,
  ScalarDataType,
} from "~src/parser/c-ast/dataTypes";
import { ExpressionWrapperP } from "~src/processor/c-ast/expression/expressions";
import { ProcessingError } from "~src/errors";
import {
  getDataTypeSize,
  isArithmeticDataType,
  isIntegeralDataType,
  isScalarDataType,
  unpackDataType,
} from "~src/processor/dataTypeUtil";
import {
  PointerDereference,
  PostfixExpression,
  PrefixExpression,
} from "~src/parser/c-ast/expression/unaryExpression";
import { SymbolTable } from "~src/processor/symbolTable";
import processExpression from "~src/processor/processExpression";
import {
  Address,
  DynamicAddress,
  MemoryLoad,
  MemoryStore,
} from "~src/processor/c-ast/memory";
import { createMemoryOffsetIntegerConstant, getDataTypeOfExpression } from "~src/processor/util";

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
  operator: BinaryOperator
) {
  if (
    !isScalarDataType(leftExprDataType) ||
    !isScalarDataType(rightExprDataType)
  ) {
    throw new ProcessingError(
      `'${operator}' expression cannot be performed on non-scalar type`
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
      throw new ProcessingError("Cannot perform arithmetic on void pointer");
    }
    if (operator !== "-" && !isRelationalOperator(operator)) {
      throw new ProcessingError(
        `Cannot perform '${operator}' binary operation on 2 pointer type operands'`
      );
    }
  } else if (leftExprDataType.type === "pointer") {
    if (leftExprDataType.pointeeType === null) {
      throw new ProcessingError("Cannot perform arithmetic on void pointer");
    }
    if (operator !== "+" && operator !== "-") {
      throw new ProcessingError(
        `Cannot perform '${operator}' binary operation on pointer and non-pointer type`
      );
    }
    if (!isIntegeralDataType(rightExprDataType)) {
      throw new ProcessingError(
        `Cannot perform '${operator}' binary operation on pointer and non-integral type`
      );
    }
  } else if (rightExprDataType.type === "pointer") {
    if (rightExprDataType.pointeeType === null) {
      throw new ProcessingError("Cannot perform arithmetic on void pointer");
    }
    if (operator !== "+" && operator !== "-") {
      throw new ProcessingError(
        `Cannot perform '${operator}' binary operation on pointer and non-pointer type`
      );
    }
    if (!isIntegeralDataType(leftExprDataType)) {
      throw new ProcessingError(
        `Cannot perform '${operator}' binary operation on pointer and non-integral type`
      );
    }
  } else {
    // TODO: add more data type checks here in future
  }
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
  operator: BinaryOperator
): ScalarDataType {
  // if either data type are pointers, then target data type is pointer TODO: check this
  if (leftExprDataType.type === "pointer") {
    return leftExprDataType;
  } else if (rightExprDataType.type === "pointer") {
    return rightExprDataType;
  } else if (
    isFloatType(leftExprDataType.primaryDataType) &&
    isFloatType(rightExprDataType.primaryDataType)
  ) {
    // take more higher ranking float type
    if (
      primaryDataTypeSizes[rightExprDataType.primaryDataType] >
      primaryDataTypeSizes[leftExprDataType.primaryDataType]
    ) {
      return leftExprDataType;
    } else {
      return rightExprDataType;
    }
  } else if (isFloatType(leftExprDataType.primaryDataType)) {
    // float types have greater precedence than any integer types
    return leftExprDataType;
  } else if (isFloatType(rightExprDataType.primaryDataType)) {
    return rightExprDataType;
  } else {
    // both types are integers
    // special handling for bitwise shift, which does not follow usual arithmetic implicit conversion rules
    if (operator === "<<" || operator === ">>") {
      return leftExprDataType;
    }

    if (
      primaryDataTypeSizes[rightExprDataType.primaryDataType] >
      primaryDataTypeSizes[leftExprDataType.primaryDataType]
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
  if (isRelationalOperator(operator)) {
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
  const memoryStoreNodes: MemoryStore[] = [];
  let memoryLoad: MemoryLoad;
  let dataType: DataType;

  const binaryOperator = expr.operator === "++" ? "+" : "-";

  if (expr.expr.type === "IdentifierExpression") {
    const symbolEntry = symbolTable.getSymbolEntry(expr.expr.name);

    if (
      symbolEntry.type === "function" ||
      (symbolEntry.dataType.type !== "pointer" &&
        symbolEntry.dataType.type !== "primary")
    ) {
      throw new ProcessingError(
        "wrong type argument in increment or decrement expression"
      );
    }

    const unpackedDataType = unpackDataType(symbolEntry.dataType); // will only have 1 element in array since primary/pointer type

    const identifierAddress: Address = {
      type:
        symbolEntry.type === "localVariable"
          ? "LocalAddress"
          : "DataSegmentAddress",
      offset: createMemoryOffsetIntegerConstant(symbolEntry.offset), // add the offset of the original symbol
      dataType: "pointer",
    };

    memoryLoad = {
      type: "MemoryLoad",
      address: identifierAddress,
      dataType: unpackedDataType[0].dataType,
    };

    dataType = symbolEntry.dataType;

    if (
      symbolEntry.dataType.type === "pointer" &&
      symbolEntry.dataType.pointeeType === null
    ) {
      throw new ProcessingError("Cannot perform arithmetic on a void pointer");
    }

    memoryStoreNodes.push({
      type: "MemoryStore",
      address: identifierAddress,
      dataType: unpackedDataType[0].dataType,
      value: {
        type: "BinaryExpression",
        leftExpr: memoryLoad,
        rightExpr: {
          type: "IntegerConstant",
          value:
            symbolEntry.dataType.type === "pointer"
              ? BigInt(
                  getDataTypeSize(symbolEntry.dataType.pointeeType as DataType)
                )
              : 1n,
          dataType: "signed int", //TODO: check this type
        },
        dataType: unpackedDataType[0].dataType,
        operandTargetDataType: unpackedDataType[0].dataType,
        operator: binaryOperator,
      },
    });
  } else if (expr.expr.type === "PointerDereference") {
    // process the expression being dereferenced first
    const derefedExpression = processExpression(expr.expr.expr, symbolTable);

    const derefedExpressionDataType = getDataTypeOfExpression({expression: derefedExpression, convertArrayToPointer: true});

    if (derefedExpressionDataType.type !== "pointer") {
      throw new ProcessingError(`Cannot dereference non-pointer type`);
    }

    if (
      derefedExpressionDataType.pointeeType === null
    ) {
      throw new ProcessingError(`Cannot dereference void pointer`);
    }

    const address: DynamicAddress = {
      // address being dereferenced
      type: "DynamicAddress",
      address: derefedExpression.exprs[0], // derefed expression should only have one primary expression
      dataType: "pointer",
    };

    memoryLoad = {
      type: "MemoryLoad",
      address,
      dataType: derefedExpression.exprs[0].dataType,
    };

    dataType = derefedExpressionDataType;

    if (dataType.type === "pointer" && dataType.pointeeType === null) {
      throw new ProcessingError("Cannot perform arithmetic on a void pointer");
    }

    memoryStoreNodes.push({
      type: "MemoryStore",
      address: address,
      dataType: derefedExpression.exprs[0].dataType,
      value: {
        type: "BinaryExpression",
        leftExpr: memoryLoad,
        rightExpr: {
          type: "IntegerConstant",
          value:
            dataType.type === "pointer"
              ? BigInt(getDataTypeSize(dataType.pointeeType as DataType))
              : 1n,
          dataType: "signed int",
        },
        dataType: derefedExpression.exprs[0].dataType,
        operandTargetDataType: derefedExpression.exprs[0].dataType,
        operator: binaryOperator,
      },
    });
  } else {
    throw new ProcessingError(
      "lvalue required for increment or decrement expression"
    );
  }

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

    // check constraints for each opeartor as per 6.5.3.3 of C standard
    if (
      (prefixExpression.operator === "+" ||
        prefixExpression.operator === "-") &&
      !isArithmeticDataType(processedExpression.originalDataType)
    ) {
      throw new ProcessingError(
        `Arithmetic operand required in prefix '${prefixExpression.operator}' expression`
      );
    } else if (
      prefixExpression.operator === "~" &&
      (processedExpression.originalDataType.type !== "primary" ||
        !isIntegerType(processedExpression.originalDataType.primaryDataType))
    ) {
      throw new ProcessingError(
        `Integer-type operand required in prefix '${prefixExpression.operator}' expression`
      );
    } else if (
      prefixExpression.operator === "!" &&
      !isScalarDataType(processedExpression.originalDataType)
    ) {
      throw new ProcessingError(
        `Scalar operand required in prefix '${prefixExpression.operator}' expression`
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
