/**
 * Definition of function to process Expression expr s.
 */

import { isIntegerType } from "~src/common/utils";
import { ProcessingError, UnsupportedFeatureError, toJson } from "~src/errors";
import { Expression } from "~src/parser/c-ast/core";
import {
  ExpressionWrapperP,
  PreStatementExpressionP,
  SingleExpressionP,
} from "~src/processor/c-ast/expressions";
import { FunctionReturnMemoryLoad } from "~src/processor/c-ast/memory";
import {
  determineDataTypeOfBinaryExpression,
  processConstant,
} from "~src/processor/expressionUtil";
import { SymbolTable, VariableSymbolEntry } from "~src/processor/symbolTable";
import {
  checkFunctionNodeExprIsCallable,
  createMemoryOffsetIntegerConstant,
  runPrefixPostfixArithmeticChecks,
} from "~src/processor/util";
import {
  processFunctionCallArgs,
  processFunctionReturnType,
} from "./functionUtil";
import { getAssignmentMemoryStoreNodes } from "~src/processor/variableUtil";

export default function visitExpression(
  sourceCode: string,
  expr: Expression,
  symbolTable: SymbolTable
): ExpressionWrapperP {
  if (expr.type === "ArrayElementExpr") {
    const symbolEntry = symbolTable.getSymbolEntry(expr.name);
    if (
      symbolEntry.type === "function" ||
      (symbolEntry.dataType.type !== "array" &&
        symbolEntry.dataType.type !== "pointer")
    ) {
      throw new ProcessingError(
        `Subscripted variable '${expr.name} is neither a array nor pointer'`
      );
    }

    if (symbolEntry.dataType.type === "pointer") {
      //TODO: support when pointers are implemented fully
      throw new UnsupportedFeatureError(
        "Pointer subscripting to be supported when pointers are supported"
      );
    }

    // TODO: more complex logic to supported nested array element expr/ add structs
    if (
      symbolEntry.dataType.elementDataType.type === "primary" ||
      symbolEntry.dataType.elementDataType.type === "pointer"
    ) {
      // integer constant containing the original offset of the array
      const offsetConstant = createMemoryOffsetIntegerConstant(
        symbolEntry.offset
      );

      const evaluatedIndexExpr = visitExpression(
        sourceCode,
        expr.index,
        symbolTable
      );
      if (
        evaluatedIndexExpr.type !== "single" ||
        !isIntegerType(evaluatedIndexExpr.expr.dataType)
      ) {
        throw new ProcessingError(
          "Array subscript is not an integer",
          sourceCode,
          expr.index.position
        );
      }

      return {
        type: "single",
        expr: {
          type:
            symbolEntry.type === "localVariable"
              ? "LocalObjectMemoryLoad"
              : "DataSegmentObjectMemoryLoad",
          offset: {
            type: "BinaryExpression",
            leftExpr: offsetConstant,
            rightExpr: evaluatedIndexExpr.expr,
            operator: "+",
            dataType: determineDataTypeOfBinaryExpression(
              offsetConstant,
              evaluatedIndexExpr.expr,
              "+"
            ),
          },
          dataType:
            symbolEntry.dataType.elementDataType.type === "primary"
              ? symbolEntry.dataType.elementDataType.primaryDataType
              : "pointer",
        },
      };
    } else if (symbolEntry.dataType.elementDataType.type === "array") {
      // arrays are treated as pointer
      // TODO: when pointers are fully implemented
      throw new UnsupportedFeatureError(
        "Treating array variable expr as pointer not supported yet"
      );
    } else if (symbolEntry.dataType.elementDataType.type === "struct") {
      // TODO: structs
      throw new UnsupportedFeatureError("Structs not yet supported");
    } else if (symbolEntry.dataType.elementDataType.type === "typedef") {
      // TODO: typedef
      throw new UnsupportedFeatureError("typedef not yet supported");
    } else {
      throw new ProcessingError("Unknown datatype");
    }
  } else if (expr.type === "Assignment") {
    // handle assignment
    const assignmentNodes = getAssignmentMemoryStoreNodes(
      sourceCode,
      expr,
      symbolTable
    );
    // visit the underlying variable expression
    const visitedVariable = visitExpression(sourceCode, expr, symbolTable);

    if (visitedVariable.type === "single") {
      return {
        type: "single",
        expr: {
          type: "PreStatementExpression",
          statements: assignmentNodes,
          expr: visitedVariable.expr,
          dataType: visitedVariable.expr.dataType,
        },
      };
    } else {
      return {
        type: "multi",
        exprs: [
          // first expr has all the assignment nodes TODO: see if any better way
          {
            type: "PreStatementExpression",
            statements: assignmentNodes,
            expr: visitedVariable.exprs[0],
            dataType: visitedVariable.exprs[0].dataType,
          },
          ...visitedVariable.exprs.slice(1),
        ],
      };
    }
  } else if (expr.type === "BinaryExpression") {
    const leftExpr = visitExpression(sourceCode, expr.leftExpr, symbolTable);

    const rightExpr = visitExpression(sourceCode, expr.rightExpr, symbolTable);

    if (leftExpr.type !== "single" || rightExpr.type !== "single") {
      throw new ProcessingError(
        "Aggregate expressions cannot be used in binary expressions",
        sourceCode,
        expr.position
      );
    }
    return {
      type: "single",
      expr: {
        type: "BinaryExpression",
        leftExpr: leftExpr.expr,
        rightExpr: rightExpr.expr,
        operator: expr.operator,
        dataType: determineDataTypeOfBinaryExpression(
          leftExpr.expr,
          rightExpr.expr,
          expr.operator
        ),
      },
    };
  } else if (expr.type === "IntegerConstant" || expr.type === "FloatConstant") {
    return { type: "single", expr: processConstant(expr) };
  } else if (expr.type === "FunctionCall") {
    checkFunctionNodeExprIsCallable(expr);
    // TODO: need to change this for function pointer support
    const func = symbolTable.getSymbolEntry(expr.expr.name);
    if (!func || func.type !== "function") {
      throw new ProcessingError(`Function ${expr.expr} not declared.`);
    }
    if (func.returnType === null) {
      throw new ProcessingError(
        `Function ${expr.expr} does not return anything, but is used as expression`
      );
    }

    const returnObjectMemoryLoads: FunctionReturnMemoryLoad[] =
      processFunctionReturnType(func.returnType).map((returnObj) => ({
        type: "FunctionReturnMemoryLoad",
        offset: createMemoryOffsetIntegerConstant(returnObj.offset),
        dataType: returnObj.dataType,
      }));

    // regardless of return type, all function call expression have a preStatementExpression
    const preStatementExpression: PreStatementExpressionP = {
      type: "PreStatementExpression",
      // run function call before loading return values
      statements: [
        {
          type: "FunctionCall",
          calledFunction: {
            type: "FunctionName",
            name: expr.expr.name,
          },
          args: processFunctionCallArgs(sourceCode, expr.args, symbolTable),
        },
      ],
      dataType: returnObjectMemoryLoads[0].dataType,
      expr: returnObjectMemoryLoads[0],
    };

    if (
      func.returnType.type === "primary" ||
      func.returnType.type === "pointer"
    ) {
      return {
        type: "single",
        expr: preStatementExpression,
      };
    } else {
      // TODO: revisit this when structs done
      return {
        type: "multi",
        exprs: [preStatementExpression, ...returnObjectMemoryLoads.slice(1)],
      };
    }
  } else if (
    expr.type === "PrefixArithmeticExpression" ||
    expr.type === "PostfixArithmeticExpression"
  ) {
    const symbolEntry = symbolTable.getSymbolEntry(
      expr.expr.name
    ) as VariableSymbolEntry;
    runPrefixPostfixArithmeticChecks(symbolEntry, sourceCode, expr.position);
    const variableLoadExpr = (
      visitExpression(sourceCode, expr.expr, symbolTable) as SingleExpressionP
    ).expr;
    return {
      type: "single",
      expr: {
        type:
          expr.type === "PrefixArithmeticExpression"
            ? "PreStatementExpression"
            : "PostStatementExpression",
        dataType: variableLoadExpr.dataType,
        statements: [
          {
            type:
              symbolEntry.type === "localVariable"
                ? "LocalObjectMemoryStore"
                : "DataSegmentObjectMemoryStore",
            offset: {
              type: "IntegerConstant",
              value: BigInt(symbolEntry.offset),
              dataType: "pointer",
            },
            dataType:
              symbolEntry.dataType.type === "primary"
                ? symbolEntry.dataType.primaryDataType
                : "pointer",
            value: {
              type: "IntegerConstant",
              value: 1n,
              dataType: "signed int", // can be any type, since it is just 1
            },
          },
        ],
        expr: variableLoadExpr,
      },
    };
  } else if (expr.type === "VariableExpr") {
    const symbolEntry = symbolTable.getSymbolEntry(expr.name);
    if (!symbolEntry) {
      throw new ProcessingError(`'${expr.name}' undeclared`);
    }
    if (symbolEntry.type === "function") {
      // TODO: to handle when function pointers supported
      throw new UnsupportedFeatureError("Function pointers not supported yet");
    }

    if (
      symbolEntry.dataType.type === "primary" ||
      symbolEntry.dataType.type === "pointer"
    ) {
      return {
        type: "single",
        expr: {
          type:
            symbolEntry.type === "localVariable"
              ? "LocalObjectMemoryLoad"
              : "DataSegmentObjectMemoryLoad",
          offset: createMemoryOffsetIntegerConstant(symbolEntry.offset),
          dataType:
            symbolEntry.dataType.type === "primary"
              ? symbolEntry.dataType.primaryDataType
              : "pointer",
        },
      };
    } else if (symbolEntry.dataType.type === "array") {
      // arrays are treated as pointer
      // TODO: when pointers are fully implemented
      throw new UnsupportedFeatureError(
        "Treating array variable expr as pointer not supported yet"
      );
    } else if (symbolEntry.dataType.type === "struct") {
      // TODO: structs
      throw new UnsupportedFeatureError("Structs not yet supported");
    } else if (symbolEntry.dataType.type === "typedef") {
      // TODO: typedef
      throw new UnsupportedFeatureError("typedef not yet supported");
    } else {
      throw new ProcessingError("Unknown data type");
    }
  } else if (expr.type === "PrefixExpression") {
    // process the underlying expression first
    const processedExpr = visitExpression(sourceCode, expr.expr, symbolTable);
    if (processedExpr.type === "multi") {
      throw new ProcessingError(
        `Wrong type argument to unary experssion with operator '${expr.operator}'}`
      );
    }
    return {
      type: "single",
      expr: {
        type: "PrefixExpression",
        operator: expr.operator,
        expr: processedExpr.expr,
        dataType: processedExpr.expr.dataType,
      },
    };
  } else {
    throw new ProcessingError(`Unhandled Expression: ${toJson(expr)}`);
  }
}
