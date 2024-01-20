/**
 * Utility functions relating to the handling of variable related nodes.
 */

import { ProcessingError } from "~src/errors";
import { Assignment } from "~src/parser/c-ast/expression/assignment";
import { MemoryLoad, MemoryStore } from "~src/processor/c-ast/memory";
import { SymbolTable } from "~src/processor/symbolTable";

import processExpression from "~src/processor/processExpression";
import { DataType } from "~src/parser/c-ast/dataTypes";

/**
 * Handles the processing of assignment to a variable.
 * Shared logic between handling Assignment and AssignmentExpression nodes.
 * Returns both the arrays of instructions needed to store the assignee expression
 * and the load the assignedto value.
 */
export function getAssignmentNodes(
  assignmentNode: Assignment,
  symbolTable: SymbolTable
): { memoryStoreStatements: MemoryStore[], memoryLoadExpressions: MemoryLoad[], dataType: DataType } {
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
      dataType: assignedMemoryLoadExprs.originalDataType
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
