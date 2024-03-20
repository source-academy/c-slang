/**
 * Utility functions relating to the handling of variable related nodes.
 */

import { ProcessingError } from "~src/errors";
import { Assignment } from "~src/parser/c-ast/expression/assignment";
import { MemoryLoad, MemoryStore } from "~src/processor/c-ast/memory";
import { SymbolTable } from "~src/processor/symbolTable";

import processExpression from "~src/processor/processExpression";
import { DataType, StructDataType } from "~src/parser/c-ast/dataTypes";
import { Expression } from "~src/parser/c-ast/core";
import { isScalarDataType } from "~src/processor/dataTypeUtil";
import { ExpressionWrapperP } from "~src/processor/c-ast/expression/expressions";
import { getDataTypeOfExpression } from "~src/processor/util";

function isAllowableLValueType(dataType: DataType) {
  return isScalarDataType(dataType) || dataType.type === "struct";
}

/**
 * Determines if a given expression is an lvalue.
 * @param expression the original expression
 * @param processedExpressionWrapper the wrapped processed expression
 */
export function isLValue(
  expression: Expression,
  processedExpressionWrapper: ExpressionWrapperP,
  symbolTable: SymbolTable
) {
  if (expression.type === "IdentifierExpression") {
    const symbolEntry = symbolTable.getSymbolEntry(expression.name);
    if (
      symbolEntry.type !== "dataSegmentVariable" &&
      symbolEntry.type !== "localVariable"
    ) {
      // enumerator / function symbol entries cannot be lvalue
      return false;
    }
  }

  return (
    (expression.type === "IdentifierExpression" ||
      expression.type === "PointerDereference" ||
      expression.type === "StructMemberAccess") &&
    isAllowableLValueType(
      getDataTypeOfExpression({ expression: processedExpressionWrapper })
    )
  );
}

export function isModifiableLValue(
  expression: Expression,
  processedExpressionWrapper: ExpressionWrapperP,
  symbolTable: SymbolTable
) {
  const dataType = getDataTypeOfExpression({
    expression: processedExpressionWrapper,
  });
  return (
    !dataType.isConst &&
    isLValue(expression, processedExpressionWrapper, symbolTable) &&
    (dataType.type !== "struct" || isStructModifiableDataType(dataType))
  );
}

export function isStructModifiableDataType(dataType: StructDataType) {
  if (dataType.isConst) {
    return false;
  }
  for (const field of dataType.fields) {
    if (
      field.isConst ||
      (field.dataType.type === "struct" &&
        !isStructModifiableDataType(field.dataType))
    ) {
      return false;
    }
  }
  return true;
}

/**
 * Handles the processing of assignment to a variable.
 * Shared logic between handling Assignment and AssignmentExpression nodes.
 * Returns both the arrays of instructions needed to store the assignee expression
 * and then load the assigned to value.
 */
export function getAssignmentNodes(
  assignmentNode: Assignment,
  symbolTable: SymbolTable
): {
  memoryStoreStatements: MemoryStore[];
  memoryLoadExpressions: MemoryLoad[];
  dataType: DataType;
} {
  try {
    // the memory load instructions from processing the expression being assigned to as an expression
    const assignedMemoryLoadExprs = processExpression(
      assignmentNode.lvalue,
      symbolTable
    );
    const assigneeExprs = processExpression(assignmentNode.expr, symbolTable);

    const result = {
      memoryStoreStatements: [] as MemoryStore[],
      memoryLoadExpressions: assignedMemoryLoadExprs.exprs as MemoryLoad[],
      dataType: assignedMemoryLoadExprs.originalDataType,
    };

    // TODO: do dataType checks
    // assigned and assignee number of primary data expression should match in length
    console.assert(
      assignedMemoryLoadExprs.exprs.length === assigneeExprs.exprs.length,
      "getAssignmentMemoryStoreNodes: assigned and assignee number of primary data expression should match in length"
    );

    // merely need to convert each memoryload into a store of the corresponding assignee expression
    for (let i = 0; i < assignedMemoryLoadExprs.exprs.length; ++i) {
      const memoryLoadExpr = assignedMemoryLoadExprs.exprs[i];
      const assigneeValue = assigneeExprs.exprs[i];
      if (memoryLoadExpr.type !== "MemoryLoad") {
        throw new ProcessingError(
          "lvalue required as left operand of assignment",
          assignmentNode.position
        );
      }
      result.memoryStoreStatements.push({
        type: "MemoryStore",
        address: memoryLoadExpr.address,
        value: assigneeValue,
        dataType: memoryLoadExpr.dataType,
      });
    }

    return result;
  } catch (e) {
    if (e instanceof ProcessingError) {
      e.addPositionInfo(assignmentNode.position);
    }
    throw e;
  }
}
