/**
 * Definitions of various utility functions.
 */

import { SymbolEntry, SymbolTable } from "~src/processor/symbolTable";
import { ProcessingError } from "~src/errors";
import { Position } from "~src/parser/c-ast/types";
import { ConditionalBlock } from "~src/parser/c-ast/select";
import { StatementP } from "~src/processor/c-ast/core";
import { FunctionDefinitionP } from "~src/processor/c-ast/function";
import { ConditionalBlockP } from "~src/processor/c-ast/select";
import { visit } from "~src/processor/visit";
import { Expression } from "~src/parser/c-ast/core";
import visitExpression from "~src/processor/visitExpression";
import { IntegerConstant } from "~src/parser/c-ast/constants";
import { IntegerConstantP } from "~src/processor/c-ast/constants";
import { pointerPrimaryDataType } from "~src/common/constants";

/**
 * Basic checks for pre/post-fix arithmetic expressions
 */
export function runPrefixPostfixArithmeticChecks(
  symbolEntry: SymbolEntry,
  sourceCode: string,
  position: Position
) {
  if (symbolEntry.type === "function") {
    throw new ProcessingError(
      "lvalue required as increment/decrement operand",
      sourceCode,
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
      sourceCode,
      position
    );
  }
}

export function processCondition(
  sourceCode: string,
  condition: Expression,
  symbolTable: SymbolTable
) {
  const processedCondition = visitExpression(
    sourceCode,
    condition,
    symbolTable
  );
  if (processedCondition.type !== "single") {
    throw new ProcessingError(
      "Used aggregate type where scalar type required",
      sourceCode,
      condition.position
    );
  }
  return processedCondition.expr;
}

export function processConditionalBlock(
  sourceCode: string,
  conditionalBlock: ConditionalBlock,
  symbolTable: SymbolTable,
  enclosingFunc?: FunctionDefinitionP
): ConditionalBlockP {
  return {
    condition: processCondition(
      sourceCode,
      conditionalBlock.condition,
      symbolTable
    ),
    body: visit(
      sourceCode,
      conditionalBlock.block,
      symbolTable,
      enclosingFunc
    ) as StatementP[],
  };
}

export function createMemoryOffsetIntegerConstant(offset: number): IntegerConstantP {
  return {
    type: "IntegerConstant",
    dataType: pointerPrimaryDataType,
    value: BigInt(offset)
  }
}
