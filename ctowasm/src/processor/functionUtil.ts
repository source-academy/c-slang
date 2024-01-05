/**
 * Utility functions for processing C functions.
 */

import { pointerPrimaryDataType } from "~src/common/constants";
import { DataType } from "~src/common/types";
import { getDataTypeSize, primaryVariableSizes } from "~src/common/utils";
import { UnsupportedFeatureError, toJson, ProcessingError } from "~src/errors";
import { Expression } from "~src/parser/c-ast/core";
import { FunctionDefinition } from "~src/parser/c-ast/function";
import { VariableDeclaration } from "~src/parser/c-ast/variable";
import { ExpressionP, StatementP } from "~src/processor/c-ast/core";
import { FunctionDefinitionP } from "~src/processor/c-ast/function";
import { MemoryObjectDetail } from "./c-ast/memory";
import { SymbolTable } from "~src/processor/symbolTable";
import { visit } from "~src/processor/visit";
import visitExpression from "~src/processor/visitExpression";

export default function processFunctionDefinition(
  sourceCode: string,
  node: FunctionDefinition,
  symbolTable: SymbolTable
): FunctionDefinitionP {
  symbolTable.addFunctionEntry(
    node.name,
    node.parameters.map((p) => p.dataType),
    node.returnType
  );

  const paramSymbolTable = new SymbolTable(symbolTable);
  const functionDefinitionNode: FunctionDefinitionP = {
    type: "FunctionDefinition",
    params: processFunctionParams(paramSymbolTable, node.parameters),
    returnMemoryDetails: node.returnType
      ? processFunctionReturnType(node.returnType)
      : null,
    sizeOfLocals: 0, // will be incremented as body is visited
    sizeOfReturn: node.returnType ? getDataTypeSize(node.returnType) : 0,
    sizeOfParams: node.parameters.reduce(
      (sum, curr) => sum + getDataTypeSize(curr.dataType),
      0
    ),
    body: [],
  };
  // visit body
  const body = visit(
    sourceCode,
    node.body,
    paramSymbolTable,
    functionDefinitionNode
  );
  functionDefinitionNode.body = body as StatementP[]; // body is a Block, an array of StatementP will be returned
  return functionDefinitionNode;
}

export function processFunctionParams(
  symbolTable: SymbolTable,
  params: VariableDeclaration[]
): MemoryObjectDetail[] {
  let offset = 0;
  const processedParams: MemoryObjectDetail[] = [];
  for (const param of params) {
    if (param.dataType.type === "primary") {
      symbolTable.addVariableEntry(param.name, param.dataType);
      processedParams.push({
        offset,
        primaryDataType: param.dataType.primaryDataType,
      });
      offset += getDataTypeSize(param.dataType);
    } else if (param.dataType.type === "pointer") {
      symbolTable.addVariableEntry(param.name, param.dataType);
      processedParams.push({ offset, primaryDataType: pointerPrimaryDataType });
      offset += getDataTypeSize(param.dataType);
    } else if (param.dataType.type === "array") {
      // arrays are passed as pointers
      symbolTable.addVariableEntry(param.name, {
        type: "pointer",
        pointeeType: param.dataType.elementDataType,
      });
      processedParams.push({ offset, primaryDataType: pointerPrimaryDataType });
      offset += primaryVariableSizes[pointerPrimaryDataType];
    } else if (param.dataType.type === "struct") {
      // TODO: when support structs
      throw new UnsupportedFeatureError(
        "processFunctionParams(): structs not yet supported"
      );
    } else if (param.dataType.type === "typedef") {
      // TODO: when support typedefo
      throw new UnsupportedFeatureError(
        "processFunctionParams(): typedef not yet supported"
      );
    } else {
      throw new Error(
        `processFunctionParams(): unhandled data type: ${toJson(
          param.dataType
        )}`
      );
    }
  }
  return processedParams;
}

export function processFunctionReturnType(returnDataType: DataType) {
  const memoryDetails: MemoryObjectDetail[] = [];
  if (returnDataType.type === "primary") {
    memoryDetails.push({
      primaryDataType: returnDataType.primaryDataType,
      offset: 0,
    });
  } else if (returnDataType.type === "pointer") {
    memoryDetails.push({
      primaryDataType: pointerPrimaryDataType,
      offset: 0,
    });
  } else if (returnDataType.type === "struct") {
    throw new UnsupportedFeatureError(
      "processFunctionReturnType(): structs not yet supported"
    );
  } else if (returnDataType.type === "typedef") {
    throw new UnsupportedFeatureError(
      "processFunctionReturnType(): structs not yet supported"
    );
  } else if (returnDataType.type === "array") {
    throw new ProcessingError("Arrays cannot be returned from a function");
  } else {
    throw new Error(
      `processFunctionReturnType(): unhandled data type: ${toJson(
        returnDataType
      )}`
    );
  }

  return memoryDetails;
}

/**
 * Process the expression that is returned from a function into a series of stores
 * of primary data objects in the return object location.
 */
export function processFunctionReturnStatement(
  sourceCode: string,
  expr: Expression,
  functionReturnDetails: MemoryObjectDetail[],
  symbolTable: SymbolTable
) {
  const statements: StatementP[] = [];
  const processedExpr = visitExpression(sourceCode, expr, symbolTable);
  let i = 0; // curr index of functionReturnDetails
  if (processedExpr.type === "single") {
    statements.push({
      type: "FunctionReturnMemoryStore",
      value: processedExpr.expr,
      dataType: processedExpr.expr.dataType,
      offset: {
        type: "IntegerConstant",
        value: BigInt(functionReturnDetails[i++].offset),
        dataType: pointerPrimaryDataType,
      },
    });
  } else {
    processedExpr.exprs.forEach((expr) => {
      statements.push({
        type: "FunctionReturnMemoryStore",
        value: expr,
        dataType: expr.dataType,
        offset: {
          type: "IntegerConstant",
          value: BigInt(functionReturnDetails[i++].offset),
          dataType: pointerPrimaryDataType,
        },
      });
    });
  }

  statements.push({
    type: "ReturnStatement",
  });
  return statements;
}

export function processFunctionCallArgs(
  sourceCode: string,
  args: Expression[],
  symbolTable: SymbolTable
) {
  const processedArgs: ExpressionP[] = [];
  for (const arg of args) {
    const processedArg = visitExpression(sourceCode, arg, symbolTable);
    if (processedArg.type === "single") {
      processedArgs.push(processedArg.expr);
    } else {
      processedArg.exprs.forEach((arg) => processedArgs.push(arg));
    }
  }
  return processedArgs;
}
