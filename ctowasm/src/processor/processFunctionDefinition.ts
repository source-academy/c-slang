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
import { FunctionSymbolEntry, SymbolTable } from "~src/processor/symbolTable";
import processExpression from "~src/processor/processExpression";
import {
  createMemoryOffsetIntegerConstant,
  getDataTypeOfExpression,
  extractFunctionDataTypeFromFunctionPointer,
} from "~src/processor/util";
import FunctionDefinition from "~src/parser/c-ast/functionDefinition";
import processBlockItem from "~src/processor/processBlockItem";
import { FunctionCall } from "~src/parser/c-ast/expression/unaryExpression";
import { getSizeOfScalarDataType } from "~src/common/utils";
import { convertFunctionDataTypeToFunctionDetails } from "~src/processor/dataTypeUtil";
import { DataType } from "~src/parser/c-ast/dataTypes";

export default function processFunctionDefinition(
  node: FunctionDefinition,
  symbolTable: SymbolTable
): FunctionDefinitionP {
  symbolTable.addFunctionEntry(node.name, node.dataType);
  symbolTable.setFunctionIsDefinedFlag(node.name);
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
      "auto" // all function parameters must have "auto" storage class
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
    functionDefinitionNode
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
  symbolTable: SymbolTable
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
      type: "MemoryStore",
      value: expr,
      dataType: expr.dataType,
      address: {
        type: "ReturnObjectAddress",
        subtype: "store",
        offset: createMemoryOffsetIntegerConstant(currOffset),
        dataType: "pointer",
      },
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
  symbolTable: SymbolTable
): { functionCallP: FunctionCallP; returnType: DataType | null } {

  // direct call of a function
  if (
    node.expr.type === "IdentifierExpression" &&
    symbolTable.getSymbolEntry(node.expr.name).type === "function"
  ) {
    const symbolEntry = symbolTable.getSymbolEntry(
      node.expr.name
    ) as FunctionSymbolEntry;
    return {
      functionCallP: {
        type: "FunctionCall",
        calledFunction: {
          type: "DirectlyCalledFunction",
          functionName: node.expr.name,
        },
        functionDetails: symbolEntry.functionDetails,
        args: node.args.reduce(
          // each inidividual expression is concatenated in reverse order, as stack grows from high to low,
          // whereas indiviudal primary data types within larger aggergates go from low to high (reverse direction)
          (prv, expr) =>
            prv.concat(processExpression(expr, symbolTable).exprs.reverse()),
          [] as ExpressionP[]
        ),
      },
      returnType: symbolEntry.dataType.returnType,
    };
  }

  // indirect call of function from an expression that is a function pointer
  const processedCalledExpr = processExpression(node.expr, symbolTable);
  const dataTypeOfCalledExpr = getDataTypeOfExpression({
    expression: processedCalledExpr,
    convertArrayToPointer: true,
  });

  const functionDataType =
    extractFunctionDataTypeFromFunctionPointer(dataTypeOfCalledExpr);

  return {
    returnType: functionDataType.returnType,
    functionCallP: {
      type: "FunctionCall",
      calledFunction: {
        type: "IndirectlyCalledFunction",
        functionAddress: processedCalledExpr.exprs[0],
      },
      functionDetails:
          convertFunctionDataTypeToFunctionDetails(functionDataType),
      args: node.args.reduce(
        // each inidividual expression is concatenated in reverse order, as stack grows from high to low,
        // whereas indiviudal primary data types within larger aggergates go from low to high (reverse direction)
        (prv, expr) =>
          prv.concat(processExpression(expr, symbolTable).exprs.reverse()),
        [] as ExpressionP[]
      ),
    },
  };
}
