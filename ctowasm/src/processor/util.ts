/**
 * Definitions of various utility functions.
 */

import { SymbolEntry, SymbolTable } from "~src/processor/symbolTable";
import { ProcessingError } from "~src/errors";
import { Position } from "~src/parser/c-ast/misc";
import { StatementP } from "~src/processor/c-ast/core";
import { FunctionDefinitionP } from "~src/processor/c-ast/function";
import { Expression } from "~src/parser/c-ast/core";
import processExpression from "~src/processor/processExpression";
import { IntegerConstantP } from "~src/processor/c-ast/expression/constants";
import { FunctionCall } from "~src/parser/c-ast/expression/unaryExpression";
import { isScalarType } from "~src/processor/dataTypeUtil";

/**
 * Basic checks for pre/post-fix arithmetic expressions
 */
export function runPrefixPostfixArithmeticChecks(
  symbolEntry: SymbolEntry,
  position: Position
) {
  if (symbolEntry.type === "function") {
    throw new ProcessingError(
      "lvalue required as increment/decrement operand",
      position
    );
  }
  if (
    !(
      symbolEntry.dataType.type === "pointer" ||
      symbolEntry.dataType.type === "primary"
    )
  ) {
    throw new ProcessingError(
      `Wrong type argument to increment/decrement: ${symbolEntry.dataType.type}`,
      position
    );
  }
}

export function processCondition(
  condition: Expression,
  symbolTable: SymbolTable
) {
  const processedCondition = processExpression(condition, symbolTable);
  if (!isScalarType(processedCondition.originalDataType)) {
    throw new ProcessingError(`Cannot use ${processedCondition.originalDataType.type} where scalar is required`)
  }
  return processedCondition.exprs[0];
}

export function createMemoryOffsetIntegerConstant(
  offset: number
): IntegerConstantP {
  return {
    type: "IntegerConstant",
    dataType: "unsigned int", // unsigned int should be appropriate type to give to IntegerConstant offsets since pointer size is 4 TODO: check this
    value: BigInt(offset),
  };
}