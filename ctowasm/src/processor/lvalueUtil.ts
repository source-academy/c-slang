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
import {
  checkAssignability,
  isScalarDataType,
  stringifyDataType,
} from "~src/processor/dataTypeUtil";
import { getDataTypeOfExpression } from "~src/processor/util";

function isAllowableLValueType(dataType: DataType, specialCase = false) {
  return (
    isScalarDataType(dataType) ||
    dataType.type === "struct" ||
    (specialCase && (dataType.type === "array" || dataType.type === "function"))
  );
}

/**
 * Determines if a given expression is an lvalue.
 * @param expression the original expression
 * @param dataType datatype of the expression
 */
export function isLValue(
  expression: Expression,
  dataType: DataType,
  symbolTable: SymbolTable,
  specialCase = false, // specialCase refers to certain expressions where types that normally are not lvalues (array/function) are treated as lvalue (sizeof, &)
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
    isAllowableLValueType(dataType, specialCase)
  );
}

export function isModifiableLValue(
  expression: Expression,
  dataType: DataType,
  symbolTable: SymbolTable,
  specialCase = false,
) {
  return (
    !dataType.isConst &&
    isLValue(expression, dataType, symbolTable, specialCase) &&
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
  symbolTable: SymbolTable,
): {
  memoryStoreStatements: MemoryStore[];
  memoryLoadExpressions: MemoryLoad[];
  dataType: DataType;
} {
  // the memory load instructions from processing the expression being assigned to as an expression
  const assignedMemoryLoadExprs = processExpression(
    assignmentNode.lvalue,
    symbolTable,
  );
  const lvalueDataType = getDataTypeOfExpression({
    expression: assignedMemoryLoadExprs,
  });
  const assignee = processExpression(assignmentNode.expr, symbolTable);
  const assigneeDataType = getDataTypeOfExpression({
    expression: assignee,
    convertArrayToPointer: true,
    convertFunctionToPointer: true,
  });

  if (lvalueDataType.type === "array" || lvalueDataType.type === "function") {
    throw new ProcessingError(
      `assignment to expression with type '${stringifyDataType(
        lvalueDataType,
      )}'`,
    );
  }

  if (!isLValue(assignmentNode.lvalue, lvalueDataType, symbolTable)) {
    throw new ProcessingError(`assignment to expression that is not a lvalue`);
  }

  if (!isModifiableLValue(assignmentNode.lvalue, lvalueDataType, symbolTable)) {
    throw new ProcessingError(
      `assignment to non-modifiable lvalue with type '${stringifyDataType(
        lvalueDataType,
      )}'`,
    );
  }

  if (!checkAssignability(lvalueDataType, assignee)) {
    throw new ProcessingError(
      `cannot assign expression with type '${stringifyDataType(
        lvalueDataType,
      )}' to '${stringifyDataType(assigneeDataType)}'`,
    );
  }

  const result = {
    memoryStoreStatements: [] as MemoryStore[],
    memoryLoadExpressions: assignedMemoryLoadExprs.exprs as MemoryLoad[],
    dataType: assignedMemoryLoadExprs.originalDataType,
  };

  // assigned and assignee number of primary data expression should match in length
  console.assert(
    assignedMemoryLoadExprs.exprs.length === assignee.exprs.length,
    "getAssignmentMemoryStoreNodes: assigned and assignee number of primary data expression should match in length",
  );

  // merely need to convert each memoryload into a store of the corresponding assignee expression
  for (let i = 0; i < assignedMemoryLoadExprs.exprs.length; ++i) {
    const memoryLoadExpr = assignedMemoryLoadExprs.exprs[i];
    const assigneeValue = assignee.exprs[i];
    if (memoryLoadExpr.type !== "MemoryLoad") {
      throw new ProcessingError(
        "lvalue required as left operand of assignment",
        assignmentNode.position,
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
}
