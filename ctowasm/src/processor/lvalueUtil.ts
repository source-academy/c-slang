/**
 * Utility functions relating to the handling of variable related nodes.
 */

import { ProcessingError, UnsupportedFeatureError } from "~src/errors";
import { Assignment } from "~src/parser/c-ast/expression/assignment";
import { MemoryStore } from "~src/processor/c-ast/memory";
import { SymbolTable } from "~src/processor/symbolTable";
import { createMemoryOffsetIntegerConstant, getDataTypeOfExpression } from "~src/processor/util";
import processExpression from "~src/processor/processExpression";
import { unpackDataType } from "~src/processor/dataTypeUtil";

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
    const assignedExprs = processExpression(assignmentNode.expr, symbolTable);

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

      // TODO: Data type check
      // if (
      //   !checkDataTypeCompatibility(
      //     symbolEntry.dataType,
      //     assignedExprs.originalDataType
      //   )
      // ) {
      //   throw new ProcessingError(
      //     `Invalid assignment expression - cannot assign ${stringifyDataType(
      //       assignedExprs.originalDataType
      //     )} to ${stringifyDataType(symbolEntry.dataType)}`
      //   );
      // }

      for (let i = 0; i < unpackedDataType.length; ++i) {
        const primaryDataObject = unpackedDataType[i];
        memoryStoreStatements.push({
          type: "MemoryStore",
          address: {
            type:
              symbolEntry.type === "localVariable"
                ? "LocalAddress"
                : "DataSegmentAddress",
            offset: createMemoryOffsetIntegerConstant(
              primaryDataObject.offset + symbolEntry.offset
            ), // add the offset of the original symbol
            dataType: "pointer",
          },
          value: assignedExprs.exprs[i],
          dataType: primaryDataObject.dataType,
        });
      }
    } else if (assignmentNode.lvalue.type === "PointerDereference") {
      // TODO: data type check
      const derefedExpression = processExpression(
        assignmentNode.lvalue.expr,
        symbolTable
      );

      const derefedExpressionDataType = getDataTypeOfExpression({expression: derefedExpression, convertArrayToPointer: true})

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
        memoryStoreStatements.push({
          type: "MemoryStore",
          address: {
            type: "DynamicAddress",
            address: derefedExpression.exprs[0],
            dataType: "pointer",
          },
          value: assignedExprs.exprs[0],
          dataType: derefedExpressionDataType.pointeeType.type === "pointer" ? "pointer" : derefedExpressionDataType.pointeeType.primaryDataType, // storing of the pointee type
        });
      } else if (
        derefedExpressionDataType.pointeeType.type === "array"
      ) {
        throw new ProcessingError(
          "Assignment to expression with array type",
          assignmentNode.position
        );
      } else {
        //TODO support structs
        throw new UnsupportedFeatureError("Structs not yet supported");
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
