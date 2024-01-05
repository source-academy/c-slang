/**
 * Utility functions relating to the handling of variable related nodes.
 */

import { POINTER_SIZE, pointerPrimaryDataType } from "~src/common/constants";
import { DataType } from "./c-ast/dataTypes";
import { getDataTypeSize, primaryVariableSizes } from "~src/common/utils";
import { ProcessingError, UnsupportedFeatureError, toJson } from "~src/errors";
import { Assignment } from "~src/parser/c-ast/assignment";
import { ArrayElementExpr, Initializer } from "~src/parser/c-ast/variable";
import { ExpressionP } from "~src/processor/c-ast/core";
import { MemoryStore, MemoryObjectDetail } from "~src/processor/c-ast/memory";
import { SymbolTable } from "~src/processor/symbolTable";
import { createMemoryOffsetIntegerConstant } from "~src/processor/util";
import visitExpression from "~src/processor/visitExpression";

/**
 * Handles the processing of assignment to a variable.
 * Shared logic between handling Assignment and AssignmentExpression nodes.
 */
export function getAssignmentMemoryStoreNodes(
  sourceCode: string,
  assignmentNode: Assignment,
  symbolTable: SymbolTable
): MemoryStore[] {
  const assignedValue = visitExpression(
    sourceCode,
    assignmentNode.value,
    symbolTable
  );

  if (assignmentNode.lvalue.type === "VariableExpr") {
    const symbolEntry = symbolTable.getSymbolEntry(assignmentNode.lvalue.name);
    if (symbolEntry.type === "function") {
      throw new ProcessingError(
        "lvalue required as left operand of assignment"
      );
    }

    if (
      symbolEntry.dataType.type === "primary" ||
      symbolEntry.dataType.type === "pointer"
    ) {
      if (assignedValue.type !== "single") {
        throw new ProcessingError(
          "Cannot assign aggregate expression to primary data type or pointer variable"
        );
      }

      return [
        {
          type:
            symbolEntry.type === "localVariable"
              ? "LocalObjectMemoryStore"
              : "DataSegmentObjectMemoryStore",
          dataType:
            symbolEntry.dataType.type === "primary"
              ? symbolEntry.dataType.primaryDataType
              : pointerPrimaryDataType,
          offset: createMemoryOffsetIntegerConstant(symbolEntry.offset),
          value: assignedValue.expr,
        },
      ];
    } else if (symbolEntry.dataType.type === "struct") {
      // TODO: structs
      throw new UnsupportedFeatureError("Structs not yet supported");
    } else if (symbolEntry.dataType.type === "typedef") {
      // TODO: typedef
      throw new UnsupportedFeatureError("typedef not yet supported");
    } else if (symbolEntry.dataType.type === "array") {
      throw new ProcessingError(
        "Assignment to expression with array type",
        sourceCode,
        assignmentNode.position
      );
    } else {
      throw new ProcessingError(
        `Unhandled assignment to variable: ${symbolEntry}`,
        sourceCode,
        assignmentNode.position
      );
    }
  } else if (assignmentNode.lvalue.type === "ArrayElementExpr") {
    const indexExpr = visitExpression(
      sourceCode,
      assignmentNode.lvalue.index,
      symbolTable
    );
    const exprBeingAssignedTo = visitExpression(
      sourceCode,
      assignmentNode.lvalue.expr,
      symbolTable
    );
  } else {
    throw new ProcessingError(
      "lvalue required as left operand to assignment",
      sourceCode,
      assignmentNode.position
    );
  } // put in struct and pointer dereferencing in future
}

/**
 * Unpacks an Initializer into an array of PrimaryDataTypeExpressionP.
 */
export function unpackInitializer(
  sourceCode: string,
  intializer: Initializer,
  symbolTable: SymbolTable
): ExpressionP[] {
  const expressions: ExpressionP[] = [];
  function helper(initializer: Initializer) {
    if (initializer.type === "InitializerSingle") {
      const expr = visitExpression(sourceCode, initializer.value, symbolTable);
      if (expr.type === "single") {
        expressions.push(expr.expr);
      } else {
        expr.exprs.forEach((e) => expressions.push(e));
      }
    } else {
      // visit all the sub initializers of this intializer list
      initializer.values.forEach((init) => helper(init));
    }
  }
  helper(intializer);
  return expressions;
}

/**
 * Unpacks a data type into an array of primary data memory objects
 */
export function unpackDataTypeIntoPrimaryDataMemoryObjects(
  dataType: DataType
): MemoryObjectDetail[] {
  const primaryDataTypes: MemoryObjectDetail[] = [];
  let currOffset = 0;
  function helper(dataType: DataType) {
    if (dataType.type === "primary") {
      primaryDataTypes.push({
        offset: currOffset,
        dataType: dataType.primaryDataType,
      });
      currOffset += getDataTypeSize(dataType);
    } else if (dataType.type === "pointer") {
      primaryDataTypes.push({
        offset: currOffset,
        dataType: pointerPrimaryDataType,
      });
      currOffset += POINTER_SIZE;
    } else if (dataType.type === "array") {
      for (let i = 0; i < dataType.numElements; ++i) {
        helper(dataType.elementDataType);
      }
    } else if (dataType.type === "struct") {
      //TODO:
      throw new UnsupportedFeatureError("structs not yet supported");
    } else if (dataType.type === "typedef") {
      //TODO:
      throw new UnsupportedFeatureError("typedef not yet supported");
    } else {
      throw new ProcessingError(
        `unpackDataTypeIntoPrimaryDataMemoryObjects(): Unhandled data type: ${toJson(
          dataType
        )}`
      );
    }
  }
  helper(dataType);
  return primaryDataTypes;
}

/**
 * Process an array element expr recursively, to reduce it to an array of primary data type memory objects.
 */
export function processArrayElementExpr(
  sourceCode: string,
  expr: ArrayElementExpr,
  symbolTable: SymbolTable
): MemoryObjectDetail[] {
  const arr = symbolTable.getSymbolEntry(expr.name); // get the original array
  if (arr.type === "function") {
    throw new ProcessingError(
      `${expr.name} is not a subscriptable type, it is a function`,
      sourceCode,
      expr.position
    );
  }
}
