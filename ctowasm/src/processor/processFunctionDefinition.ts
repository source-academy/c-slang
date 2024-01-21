/**
 * Utility functions for processing C functions.
 */

import { ProcessingError } from "~src/errors";
import { Expression } from "~src/parser/c-ast/core";
import { ExpressionP, StatementP } from "~src/processor/c-ast/core";
import {
  FunctionCallP,
  FunctionDefinitionP,
} from "~src/processor/c-ast/function";
import { SymbolTable } from "~src/processor/symbolTable";
import processExpression from "~src/processor/processExpression";
import { createMemoryOffsetIntegerConstant } from "~src/processor/util";
import FunctionDefinition from "~src/parser/c-ast/functionDefinition";
import processBlockItem from "~src/processor/processBlockItem";
import { FunctionCall } from "~src/parser/c-ast/expression/unaryExpression";
import { getSizeOfScalarDataType } from "~src/common/utils";

export default function processFunctionDefinition(
  node: FunctionDefinition,
  symbolTable: SymbolTable,
): FunctionDefinitionP {
  symbolTable.addFunctionEntry(node.name, node.dataType);

  if (
    node.dataType.returnType !== null &&
    node.dataType.returnType.type === "array"
  ) {
    throw new ProcessingError("Arrays cannot be returned from a function");
  }

  const funcSymbolTable = new SymbolTable(symbolTable);

  // add all the params to the symbol table
  for (let i = 0; i < node.parameterNames.length; ++i) {
    funcSymbolTable.addVariableEntry(
      node.parameterNames[i],
      node.dataType.parameters[i],
    );
  }

  const functionDefinitionNode: FunctionDefinitionP = {
    type: "FunctionDefinition",
    name: node.name,
    sizeOfLocals: 0, // will be incremented as body is visited
    body: [],
    dataType: node.dataType,
  };

  // visit body
  const body = processBlockItem(
    node.body,
    funcSymbolTable,
    functionDefinitionNode,
  );
  functionDefinitionNode.body = body; // body is a Block, an array of StatementP will be returned
  return functionDefinitionNode;
}

/**
 * Process the expression that is returned from a function into a series of stores
 * of primary data objects in the return object location.
 */
export function processFunctionReturnStatement(
  expr: Expression,
  symbolTable: SymbolTable,
): StatementP[] {
  const statements: StatementP[] = [];
  const processedExpr = processExpression(expr, symbolTable);

  // TODO: data type check
  // if (
  //   enclosingFunc.dataType.returnType !== null &&
  //   !checkDataTypeCompatibility(
  //     processedExpr.originalDataType,
  //     enclosingFunc.dataType.returnType
  //   )
  // ) {
  //   throw new ProcessingError(
  //     `Data type of expression being returned does not match declared function returntype - expression type: ${toJson(
  //       processedExpr.originalDataType
  //     )} declared type: ${toJson(enclosingFunc.dataType.returnType)}`
  //   );
  // }

  let currOffset = 0;
  processedExpr.exprs.forEach((expr) => {
    statements.push({
      type: "FunctionReturnMemoryStore",
      value: expr,
      dataType: expr.dataType,
      offset: createMemoryOffsetIntegerConstant(currOffset),
    });
    currOffset += getSizeOfScalarDataType(expr.dataType);
  });

  statements.push({
    type: "ReturnStatement",
  });
  return statements;
}

/**
 * Convert a FunctionCall node into its corresponding FunctionCallP.
 */
export function convertFunctionCallToFunctionCallP(
  node: FunctionCall,
  symbolTable: SymbolTable,
): FunctionCallP {
  if (node.expr.type === "IdentifierExpression") {
    const symbolEntry = symbolTable.getSymbolEntry(node.expr.name);
    if (symbolEntry.type !== "function") {
      // TODO: add function pointer check later on
      throw new ProcessingError(
        `Called object '${node.expr.name}' is neither a function nor function pointer`,
      );
    }
    // TODO: type check params and args

    // create functionDetails for this function call

    return {
      type: "FunctionCall",
      calledFunction: {
        type: "FunctionName",
        name: node.expr.name,
        // save the parameters as the primary data types
        // concatenation in reverse order per parameter to follow stack frame structure
        functionDetails: symbolEntry.processedFunctionDetails,
      },
      args: node.args.reduce(
        // each inidividual expression is concatenated in reverse order, as stack grows from high to low,
        // whereas indiviudal primary data types within larger aggergates go from low to high (reverse direction)
        (prv, expr) =>
          prv.concat(processExpression(expr, symbolTable).exprs.reverse()),
        [] as ExpressionP[],
      ),
    };
  } else {
    throw new ProcessingError(
      `Called expression is neither a function nor function pointer`,
      node.position,
    );
  }
  //TODO: add function pointer support
}
