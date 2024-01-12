/**
 * Utility functions for processing C functions.
 */

import { DataType } from "../parser/c-ast/dataTypes";
import {
  PrimaryDataTypeMemoryObjectDetails,
  getDataTypeSize,
  unpackDataType,
} from "./dataTypeUtil";
import { UnsupportedFeatureError, toJson, ProcessingError } from "~src/errors";
import { Expression } from "~src/parser/c-ast/core";
import { ExpressionP, StatementP } from "~src/processor/c-ast/core";
import {
  FunctionCallP,
  FunctionDefinitionP,
} from "~src/processor/c-ast/function";
import { SymbolTable } from "~src/processor/symbolTable";
import processExpression from "~src/processor/processExpression";
import { POINTER_SIZE } from "~src/common/constants";
import { createMemoryOffsetIntegerConstant } from "~src/processor/util";
import FunctionDefinition from "~src/parser/c-ast/functionDefinition";
import processBlockItem from "~src/processor/processBlockItem";
import { FunctionCall } from "~src/parser/c-ast/expression/unaryExpression";

export default function processFunctionDefinition(
  node: FunctionDefinition,
  symbolTable: SymbolTable
): FunctionDefinitionP {
  symbolTable.addFunctionEntry(node.name, node.dataType);

  const paramSymbolTable = new SymbolTable(symbolTable);
  const functionDefinitionNode: FunctionDefinitionP = {
    type: "FunctionDefinition",
    params: processFunctionParams(
      paramSymbolTable,
      node.name,
      node.dataType.parameters,
      node.parameterNames
    ),
    returnMemoryDetails:
      node.dataType.returnType !== null
        ? processFunctionReturnType(node.dataType.returnType)
        : null,
    sizeOfLocals: 0, // will be incremented as body is visited
    sizeOfReturn:
      node.dataType.returnType !== null
        ? getDataTypeSize(node.dataType.returnType)
        : 0,
    sizeOfParams: node.dataType.parameters.reduce(
      (sum, paramDataType) => sum + getDataTypeSize(paramDataType),
      0
    ),
    body: [],
  };
  // visit body
  const body = processBlockItem(
    node.body,
    paramSymbolTable,
    functionDefinitionNode
  );
  functionDefinitionNode.body = body; // body is a Block, an array of StatementP will be returned
  return functionDefinitionNode;
}

export function processFunctionParams(
  symbolTable: SymbolTable,
  functionName: string,
  paramDataTypes: DataType[],
  paramNames: string[]
): PrimaryDataTypeMemoryObjectDetails[] {
  let offset = 0;
  const processedParams: PrimaryDataTypeMemoryObjectDetails[] = [];

  for (let i = 0; i < paramNames.length; ++i) {
    const paramDataType = paramDataTypes[i];
    const paramName = paramNames[i];

    if (paramDataTypes.length !== paramNames.length) {
      throw new ProcessingError(
        `Number of parameter data types does not match number of parameter names in function '${functionName}'`
      );
    }

    if (paramDataType.type === "primary") {
      symbolTable.addVariableEntry(paramName, paramDataType);
      processedParams.push({
        offset,
        dataType: paramDataType.primaryDataType,
      });
      offset += getDataTypeSize(paramDataType);
    } else if (paramDataType.type === "pointer") {
      symbolTable.addVariableEntry(paramName, paramDataType);
      processedParams.push({ offset, dataType: "pointer" });
      offset += getDataTypeSize(paramDataType);
    } else if (paramDataType.type === "array") {
      // arrays are passed as pointers
      symbolTable.addVariableEntry(paramName, {
        type: "pointer",
        pointeeType: paramDataType.elementDataType,
      });
      processedParams.push({ offset, dataType: "pointer" });
      offset += POINTER_SIZE;
    } else if (paramDataType.type === "struct") {
      // TODO: when support structs
      throw new UnsupportedFeatureError(
        "processFunctionParams(): structs not yet supported"
      );
    } else {
      throw new Error(
        `processFunctionParams(): unhandled data type: ${toJson(paramDataType)}`
      );
    }
  }
  return processedParams;
}

export function processFunctionReturnType(returnDataType: DataType) {
  if (returnDataType.type === "array") {
    throw new ProcessingError("Arrays cannot be returned from a function");
  }
  return unpackDataType(returnDataType);
}

/**
 * Process the expression that is returned from a function into a series of stores
 * of primary data objects in the return object location.
 */
export function processFunctionReturnStatement(
  expr: Expression,
  functionReturnDetails: PrimaryDataTypeMemoryObjectDetails[], // TODO: consider if this is really ncessary in futture
  symbolTable: SymbolTable
): StatementP[] {
  const statements: StatementP[] = [];
  const processedExpr = processExpression(expr, symbolTable);

  // sanity check - the types of processedExpression and the function return details should match
  if (functionReturnDetails.length !== processedExpr.exprs.length) {
    throw new ProcessingError(
      "Number of primary objects in returned expression does not match the function return details"
    );
  }

  let i = 0; // curr index of functionReturnDetails

  processedExpr.exprs.forEach((expr) => {
    statements.push({
      type: "FunctionReturnMemoryStore",
      value: expr,
      dataType: expr.dataType,
      offset: createMemoryOffsetIntegerConstant(
        functionReturnDetails[i++].offset
      ),
    });
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
): FunctionCallP {
  if (node.expr.type === "IdentifierExpression") {
    const symbolEntry = symbolTable.getSymbolEntry(node.expr.name);
    if (symbolEntry.dataType.type !== "function") {
      throw new ProcessingError(
        `Called object '${node.expr.name}' is neither a function nor function pointer`
      );
    }
    return {
      type: "FunctionCall",
      calledFunction: {
        type: "FunctionName",
        name: node.expr.name,
      },
      args: node.args.reduce(
        (prv, expr) => prv.concat(processExpression(expr, symbolTable).exprs),
        [] as ExpressionP[]
      ),
    };
  } else {
    throw new ProcessingError(
      `Called expression is neither a function nor function pointer`,
      node.position
    );
  }
  //TODO: add function pointer support
}
