/**
 * Utility functions relating to the handling of variable related nodes.
 */

import { ProcessingError, UnsupportedFeatureError } from "~src/errors";
import { Assignment } from "~src/parser/c-ast/expression/assignment";
import { MemoryLoad, MemoryStore } from "~src/processor/c-ast/memory";
import { SymbolTable } from "~src/processor/symbolTable";
import { createMemoryOffsetIntegerConstant } from "~src/processor/util";
import processExpression from "~src/processor/processExpression";
import { Expression } from "~src/parser/c-ast/core";
import {
  areDataTypesEqual,
  stringifyDataType,
  unpackDataType,
} from "~src/processor/dataTypeUtil";
import { DataType } from "~src/parser/c-ast/dataTypes";
import { getDerefExpressionMemoryDetails } from "~src/processor/expressionUtil";

/**
 * Handles the processing of assignment to a variable.
 * Shared logic between handling Assignment and AssignmentExpression nodes.
 */
export function getAssignmentMemoryStoreNodes(
  assignmentNode: Assignment,
  symbolTable: SymbolTable
): MemoryStore[] {
  
  try {
    const memoryStoreStatements: MemoryStore[] = [];
    const assignedExprs = processExpression(assignmentNode.value, symbolTable);

    if (assignmentNode.lvalue.type === "IdentifierExpression") {
      const symbolEntry = symbolTable.getSymbolEntry(
        assignmentNode.lvalue.name
      );
      if (symbolEntry.type === "function") {
        throw new ProcessingError(
          "lvalue required as left operand of assignment",
          assignmentNode.position
        );
      } else if (symbolEntry.dataType.type === "array") {
        throw new ProcessingError(
          "Assignment to expression with array type",
          assignmentNode.position
        );
      }

      const unpackedDataType = unpackDataType(symbolEntry.dataType);

      if (
        !areDataTypesEqual(symbolEntry.dataType, assignedExprs.originalDataType)
      ) {
        throw new ProcessingError(
          `Invalid assignment expression - cannot assign ${stringifyDataType(
            assignedExprs.originalDataType
          )} to ${stringifyDataType(symbolEntry.dataType)}`
        );
      }

      for (let i = 0; i < unpackedDataType.length; ++i) {
        const primaryDataObject = unpackedDataType[i];
        memoryStoreStatements.push({
          type: "MemoryStore",
          address: {
            type:
              symbolEntry.type === "localVariable"
                ? "LocalAddress"
                : "DataSegmentAddress",
            offset: createMemoryOffsetIntegerConstant(primaryDataObject.offset + symbolEntry.offset), // add the offset of the original symbol
            dataType: primaryDataObject.dataType,
          },
          value: assignedExprs.exprs[i],
          dataType: primaryDataObject.dataType,
        });
      }
    } else if (assignmentNode.lvalue.type === "PointerDereference") {
      const derefedExpressionMemoryDetails = getDerefExpressionMemoryDetails(assignmentNode.lvalue, symbolTable); 

      if (
        // void pointer is already checked for
        !areDataTypesEqual(derefedExpressionMemoryDetails.originalDataType, assignedExprs.originalDataType)
      ) {
        throw new ProcessingError(
          `Invalid assignment expression - cannot assign ${stringifyDataType(
            assignedExprs.originalDataType
          )} to ${stringifyDataType(derefedExpressionMemoryDetails.originalDataType)}`
        );
      }

      for (let i = 0; i < derefedExpressionMemoryDetails.primaryMemoryObjectDetails.length; ++i) {
        const primaryDataObject = derefedExpressionMemoryDetails.primaryMemoryObjectDetails[i];
        memoryStoreStatements.push({
          type: "MemoryStore",
          address: primaryDataObject.address,
          value: assignedExprs.exprs[i],
          dataType: primaryDataObject.dataType,
        });
      }
    } else {
      //TODO: add struct -> and . in future
      throw new ProcessingError(
        "lvalue required as left operand of assignment",
        assignmentNode.position
      );
    }

    return memoryStoreStatements;
  } catch (e) {
    if (e instanceof ProcessingError) {
      e.addPositionInfo(assignmentNode.position);
    }
    throw e;
  }
}
