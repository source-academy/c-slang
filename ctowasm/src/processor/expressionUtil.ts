/**
 * Definitions of various utility functions used for processing the C AST expressions.
 */

import { BinaryOperator, ScalarCDataType } from "~src/common/types";

import {
  getSizeOfScalarDataType,
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
  isArithmeticType,
  isScalarType,
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
import { createMemoryOffsetIntegerConstant } from "~src/processor/util";
import { IntegerConstantP } from "~src/processor/c-ast/expression/constants";

/**
 * Returns the correct varaible type for a binary expression accorsinf to rules of arithemetic conversion 6.3.1.8 in C17 standard.
 * Follows integer promition rules for integral types. Promotion follows by size of the variable (larger size = higher rank)
 */
export function determineDataTypeOfBinaryExpression(
  leftExprDataType: DataType,
  rightExprDataType: DataType,
  operator: BinaryOperator
): ScalarDataType {
  if (!isScalarType(leftExprDataType) || !isScalarType(rightExprDataType)) {
    throw new ProcessingError(
      `'${operator}' expression cannot be performed on non-scalar type`
    );
  }

  leftExprDataType = leftExprDataType as PointerDataType | PrimaryDataType;
  rightExprDataType = rightExprDataType as PointerDataType | PrimaryDataType;

  if (
    (leftExprDataType.type === "pointer" ||
      rightExprDataType.type === "pointer") &&
    operator !== "+" &&
    operator !== "-" &&
    operator !== "!=" &&
    operator !== "<" &&
    operator !== "<=" &&
    operator !== "==" &&
    operator !== ">=" &&
    operator !== ">"
  ) {
    throw new ProcessingError(
      `Cannot perform '${operator} binary operation on pointer type'`
    );
  }

  if (leftExprDataType.type === "pointer" && rightExprDataType.type === "pointer") {
    if (operator === "+") {
      throw new ProcessingError(`Cannot perform '${operator}' binary operation on 2 pointer type operands'`);
    }
    // TODO: add pointer type check
    return leftExprDataType;
  }

  if (leftExprDataType.type === "pointer" || rightExprDataType.type === "pointer") {
    if (operator !== "+" && operator !== "-") {
      throw new ProcessingError(`Cannot perform '${operator}' binary operation on pointer type operand and other operand'`); 
    }
    if (!(leftExprDataType.type === "primary" && isIntegerType(leftExprDataType.primaryDataType)) && !(rightExprDataType.type === "primary" && isIntegerType(rightExprDataType.primaryDataType))) {
      throw new ProcessingError("Cannot add a non-integral type to a pointer");
    }

    return leftExprDataType.type === "pointer" ? leftExprDataType : rightExprDataType;
  }

  if (
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
 * Details of the memory of the pointer expression that is being dereferenced.
 */
interface DerefExpressionMemoryDetails {
  originalDataType: DataType; // data type after dereferencing
  primaryMemoryObjectDetails: {
    dataType: ScalarCDataType;
    address: DynamicAddress;
  }[];
}

/**
 * Get the details of the primary memory objects of a dereferenced expression.
 */
export function getDerefExpressionMemoryDetails(
  expr: PointerDereference,
  symbolTable: SymbolTable
): DerefExpressionMemoryDetails {
  // process the expression being dereferenced first
  const derefedExpression = processExpression(expr.expr, symbolTable);

  if (derefedExpression.originalDataType.type !== "pointer") {
    throw new ProcessingError(`Cannot dereference non-pointer type`);
  }

  if (derefedExpression.originalDataType.pointeeType === null) {
    throw new ProcessingError(`Cannot dereference void pointer`);
  }

  if (
    derefedExpression.originalDataType.pointeeType.type === "primary" ||
    derefedExpression.originalDataType.pointeeType.type === "pointer"
  ) {
    return {
      originalDataType: derefedExpression.originalDataType.pointeeType,
      primaryMemoryObjectDetails: [
        {
          dataType: derefedExpression.exprs[0].dataType,
          address: {
            type: "DynamicAddress",
            address: derefedExpression.exprs[0],
            dataType: "pointer",
          },
        },
      ],
    };
  } else if (derefedExpression.originalDataType.pointeeType.type === "array") {
    // the resultant data type of the whole dereference expression should be pointer to the array element type, as arrays are treated as pointers
    return {
      originalDataType: {
        type: "pointer",
        pointeeType:
          derefedExpression.originalDataType.pointeeType.elementDataType,
      },
      primaryMemoryObjectDetails: [
        {
          dataType: "pointer",
          address: {
            type: "DynamicAddress",
            address: derefedExpression.exprs[0],
            dataType: "pointer",
          },
        },
      ],
    };
  } else {
    // if the derefed expression is a pointer to an array, then return pointer to the array element type (as arrays should be treated as pointers)
    const memoryDetails: DerefExpressionMemoryDetails = {
      originalDataType: derefedExpression.originalDataType.pointeeType,
      primaryMemoryObjectDetails: [],
    };

    // the expression being derefed cannot have more than 1 primary data expresssion as it is a pointer
    // this shouldnt happen - just a sanity check
    if (derefedExpression.exprs.length !== 1) {
      throw new ProcessingError("Invalid dereference");
    }

    const unpackedDataType = unpackDataType(
      derefedExpression.originalDataType.pointeeType
    );

    for (let i = 0; i < unpackedDataType.length; ++i) {
      const primaryDataObject = unpackedDataType[i];
      memoryDetails.primaryMemoryObjectDetails.push({
        dataType: primaryDataObject.dataType,
        address: {
          type: "DynamicAddress",
          address: {
            type: "BinaryExpression",
            leftExpr: derefedExpression.exprs[0], // value of the pointer being dereferenced
            rightExpr: createMemoryOffsetIntegerConstant(
              primaryDataObject.offset
            ),
            dataType: "pointer",
            operator: "+",
          }, // add the offset of the original symbol
          dataType: "pointer",
        },
      });
    }

    return memoryDetails;
  }
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
      dataType: unpackedDataType[0].dataType,
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
        operator: binaryOperator,
      },
    });
  } else if (expr.expr.type === "PointerDereference") {
    // process the expression being dereferenced first
    const derefedExpressionMemoryDetails = getDerefExpressionMemoryDetails(
      expr.expr,
      symbolTable
    );

    if (
      derefedExpressionMemoryDetails.originalDataType.type !== "pointer" &&
      derefedExpressionMemoryDetails.originalDataType.type !== "primary"
    ) {
      throw new ProcessingError(
        "wrong type argument in increment or decrement expression"
      );
    }

    // sanity check - derefedExpressionMemoryDetails should only have one primary memory object as it is scalar type
    if (derefedExpressionMemoryDetails.primaryMemoryObjectDetails.length > 1) {
      throw new ProcessingError("Invalid increment/decrement expression");
    }

    memoryLoad = {
      type: "MemoryLoad",
      address:
        derefedExpressionMemoryDetails.primaryMemoryObjectDetails[0].address,
      dataType:
        derefedExpressionMemoryDetails.primaryMemoryObjectDetails[0].dataType,
    };

    dataType = derefedExpressionMemoryDetails.originalDataType;

    if (dataType.type === "pointer" && dataType.pointeeType === null) {
      throw new ProcessingError("Cannot perform arithmetic on a void pointer");
    }

    memoryStoreNodes.push({
      type: "MemoryStore",
      address:
        derefedExpressionMemoryDetails.primaryMemoryObjectDetails[0].address,
      dataType:
        derefedExpressionMemoryDetails.primaryMemoryObjectDetails[0].dataType,
      value: {
        type: "BinaryExpression",
        leftExpr: memoryLoad,
        rightExpr: {
          type: "IntegerConstant",
          value:
            dataType.type === "pointer"
              ? BigInt(getDataTypeSize(dataType.pointeeType as DataType))
              : 1n,
          dataType: "signed int", //TODO: check this type
        },
        dataType:
          derefedExpressionMemoryDetails.primaryMemoryObjectDetails[0].dataType,
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
      !isArithmeticType(processedExpression.originalDataType)
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
      !isScalarType(processedExpression.originalDataType)
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
