/**
 * Definition of function to process Expression expr s.
 */

import { ProcessingError, toJson } from "~src/errors";
import { Expression } from "~src/parser/c-ast/core";
import {
  ExpressionWrapperP,
  PreStatementExpressionP,
} from "~src/processor/c-ast/expression/expressions";
import { MemoryLoad } from "~src/processor/c-ast/memory";
import {
  determineConditionalExpressionDataType,
  determineOperandTargetDataTypeOfBinaryExpression,
  determineResultDataTypeOfBinaryExpression,
  processPostfixExpression,
  processPrefixExpression,
} from "~src/processor/expressionUtil";
import { SymbolTable } from "~src/processor/symbolTable";
import {
  createFunctionTableIndexExpressionWrapper,
  createMemoryOffsetIntegerConstant,
  getDataTypeOfExpression,
  isFunctionPointer,
} from "~src/processor/util";
import { convertFunctionCallToFunctionCallP } from "~src/processor/processFunctionDefinition";
import { getAssignmentNodes, isLValue } from "~src/processor/lvalueUtil";
import {
  determineIndexAndDataTypeOfFieldInStruct,
  getDataTypeSize,
  isVoidPointer,
  unpackDataType,
} from "~src/processor/dataTypeUtil";
import { IntegerDataType } from "~src/common/types";
import processConstant from "~src/processor/processConstant";
import { PTRDIFF_T, SIZE_T } from "~src/common/constants";
import {
  DataType,
  PointerDataType,
  ScalarDataType,
} from "~src/parser/c-ast/dataTypes";
import { getSizeOfScalarDataType } from "~src/common/utils";
import processBlockItem from "~src/processor/processBlockItem";
import { FunctionDefinitionP } from "~src/processor/c-ast/function";
import { StatementP } from "~src/processor/c-ast/core";
import { addWarning } from "~src/processor/warningUtil";
import {
  checkBinaryExpressionConstraints,
  checkConditionalExpressionOperands,
} from "~src/processor/constraintChecks";

/**
 * Processes an Expression node in the context where value(s) are expected to be loaded from memory for use in a statement (action).
 */
export default function processExpression(
  expr: Expression,
  symbolTable: SymbolTable,
  enclosingFunc?: FunctionDefinitionP,
): ExpressionWrapperP {
  try {
    if (expr.type === "Assignment") {
      const { memoryStoreStatements, memoryLoadExpressions, dataType } =
        getAssignmentNodes(expr, symbolTable);

      return {
        originalDataType: dataType,
        exprs: [
          // first expr has all the assignment nodes TODO: see if any better way
          {
            type: "PreStatementExpression",
            statements: memoryStoreStatements,
            expr: memoryLoadExpressions[0],
            dataType: memoryLoadExpressions[0].dataType,
          },
          ...memoryLoadExpressions.slice(1),
        ],
      };
    } else if (expr.type === "BinaryExpression") {
      const processedLeftExpr = processExpression(expr.leftExpr, symbolTable);
      const processedLeftExprDataType = getDataTypeOfExpression({
        expression: processedLeftExpr,
        convertArrayToPointer: true,
        convertFunctionToPointer: true,
      });
      const processedRightExpr = processExpression(expr.rightExpr, symbolTable);
      const processedRightExprDataType = getDataTypeOfExpression({
        expression: processedRightExpr,
        convertArrayToPointer: true,
        convertFunctionToPointer: true,
      });

      checkBinaryExpressionConstraints(
        expr,
        processedLeftExpr,
        processedRightExpr,
      );

      // at this point all the operands can only be scalar data types

      const binaryExpressionDataType =
        determineResultDataTypeOfBinaryExpression(
          processedLeftExprDataType as ScalarDataType,
          processedRightExprDataType as ScalarDataType,
          expr.operator,
        );

      const operandTargetDataType =
        determineOperandTargetDataTypeOfBinaryExpression(
          processedLeftExprDataType as ScalarDataType,
          processedRightExprDataType as ScalarDataType,
          expr.operator,
        );

      let leftExpr = processedLeftExpr.exprs[0];
      let rightExpr = processedRightExpr.exprs[0];

      // account for pointer type arithmetic - already checked that it must be '+' or '-' in determineDataTypeOfBinaryExpression
      if (
        processedLeftExprDataType.type === "pointer" &&
        processedRightExprDataType.type === "primary"
      ) {
        rightExpr = {
          type: "BinaryExpression",
          operator: "*",
          leftExpr: rightExpr,
          rightExpr: {
            type: "IntegerConstant",
            value: BigInt(
              getDataTypeSize(
                processedLeftExprDataType.pointeeType as DataType,
              ),
            ), // void pointer already checked for
            dataType: rightExpr.dataType as IntegerDataType, // datatype is confirmed by determineDataTypeOfBinaryExpression
          },
          dataType: rightExpr.dataType,
          operandTargetDataType: rightExpr.dataType,
        };
      } else if (
        processedRightExprDataType.type === "pointer" &&
        processedLeftExprDataType.type === "primary"
      ) {
        leftExpr = {
          type: "BinaryExpression",
          operator: "*",
          leftExpr: leftExpr,
          rightExpr: {
            type: "IntegerConstant",
            value: BigInt(
              getDataTypeSize(
                processedRightExprDataType.pointeeType as DataType,
              ),
            ),
            dataType: leftExpr.dataType as IntegerDataType, // datatype is confirmed by determineDataTypeOfBinaryExpression
          },
          dataType: leftExpr.dataType,
          operandTargetDataType: leftExpr.dataType,
        };
      }

      if (
        processedRightExprDataType.type === "pointer" &&
        processedLeftExprDataType.type === "pointer" &&
        expr.operator === "-"
      ) {
        // special handling for subtraction between pointers, need to divide result by underlying type size
        return {
          originalDataType: binaryExpressionDataType,
          exprs: [
            {
              type: "BinaryExpression",
              leftExpr: {
                type: "BinaryExpression",
                leftExpr,
                rightExpr,
                operator: expr.operator,
                dataType:
                  binaryExpressionDataType.type === "pointer"
                    ? "pointer"
                    : binaryExpressionDataType.primaryDataType,
                operandTargetDataType: "pointer",
              },
              operator: "/",
              rightExpr: {
                type: "IntegerConstant",
                value: BigInt(
                  getDataTypeSize(
                    processedRightExprDataType.pointeeType as DataType,
                  ),
                ),
                dataType: PTRDIFF_T,
              },
              dataType: PTRDIFF_T,
              operandTargetDataType: PTRDIFF_T,
            },
          ],
        };
      }

      return {
        originalDataType: binaryExpressionDataType,
        exprs: [
          {
            type: "BinaryExpression",
            leftExpr,
            rightExpr,
            operator: expr.operator,
            dataType:
              binaryExpressionDataType.type === "pointer"
                ? "pointer"
                : binaryExpressionDataType.primaryDataType,
            operandTargetDataType:
              operandTargetDataType.type === "pointer"
                ? "pointer"
                : operandTargetDataType.primaryDataType,
          },
        ],
      };
    } else if (
      expr.type === "IntegerConstant" ||
      expr.type === "FloatConstant"
    ) {
      const processedConstant = processConstant(expr);
      return {
        originalDataType: {
          type: "primary",
          primaryDataType: processedConstant.dataType,
        },
        exprs: [processedConstant],
      };
    } else if (expr.type === "FunctionCall") {
      const {
        functionCallP: functionCallStatement,
        returnType: funcReturnType,
      } = convertFunctionCallToFunctionCallP(expr, symbolTable);

      if (funcReturnType.type === "void") {
        // trying to use a function call as an expression in context that expects a return object
        throw new ProcessingError("void value not ignored as it should be");
      }

      // start curr offset at negative of the size of the return obj
      let currOffset = -getDataTypeSize(funcReturnType);
      const returnObjectMemoryLoads: MemoryLoad[] = [];

      unpackDataType(funcReturnType).forEach((returnObj) => {
        returnObjectMemoryLoads.push({
          type: "MemoryLoad",
          address: {
            type: "ReturnObjectAddress",
            subtype: "load",
            offset: createMemoryOffsetIntegerConstant(currOffset),
            dataType: "pointer",
          },
          dataType: returnObj.dataType,
        });
        currOffset += getSizeOfScalarDataType(returnObj.dataType);
      });

      // regardless of return type, all function call expression have a preStatementExpression
      return {
        originalDataType: funcReturnType,
        exprs: [
          {
            type: "PreStatementExpression",
            // run function call before loading return values
            statements: [functionCallStatement],
            dataType: returnObjectMemoryLoads[0].dataType,
            expr: returnObjectMemoryLoads[0],
          },
          ...returnObjectMemoryLoads.slice(1),
        ],
      };
    } else if (expr.type === "TypeCastingExpression") {
      // type casting is just a way to tell the compiler to treat an expression as another type
      // no actual conversion is done here
      const processedExpr = processExpression(expr.expr, symbolTable);
      const targetDataType = expr.targetDataType;

      return {
        originalDataType: targetDataType,
        exprs: [
          {
            type: "PreStatementExpression",
            statements: [],
            expr: processedExpr.exprs[0],
            dataType: processedExpr.exprs[0].dataType,
          },
          ...processedExpr.exprs.slice(1),
        ],
      };
    } else if (expr.type === "PrefixExpression") {
      return processPrefixExpression(expr, symbolTable);
    } else if (expr.type === "PostfixExpression") {
      return processPostfixExpression(expr, symbolTable);
    } else if (expr.type === "IdentifierExpression") {
      const symbolEntry = symbolTable.getSymbolEntry(expr.name);
      if (!symbolEntry) {
        throw new ProcessingError(`'${expr.name}' undeclared`);
      }

      // a function becomes a pointer to a function
      if (symbolEntry.type === "function") {
        return createFunctionTableIndexExpressionWrapper(
          expr.name,
          symbolEntry.dataType,
          symbolTable,
        );
      }

      if (symbolEntry.type === "enumerator") {
        // enumerator values are just compile-time constants
        return {
          originalDataType: symbolEntry.dataType,
          exprs: [
            {
              type: "IntegerConstant",
              value: symbolEntry.value,
              dataType: symbolEntry.dataType.primaryDataType,
            },
          ],
        };
      }

      if (symbolEntry.dataType.type === "array") {
        // arrays are treated as pointer
        return {
          originalDataType: symbolEntry.dataType,
          exprs: [
            {
              type:
                symbolEntry.type === "dataSegmentVariable"
                  ? "DataSegmentAddress"
                  : "LocalAddress",
              offset: createMemoryOffsetIntegerConstant(symbolEntry.offset),
              dataType: "pointer",
            },
          ],
        };
      } else {
        const unpackedDataType = unpackDataType(symbolEntry.dataType);
        return {
          originalDataType: symbolEntry.dataType,
          exprs: unpackedDataType.map((primaryDataObject) => ({
            type: "MemoryLoad",
            address: {
              type:
                symbolEntry.type === "dataSegmentVariable"
                  ? "DataSegmentAddress"
                  : "LocalAddress",
              offset: createMemoryOffsetIntegerConstant(
                symbolEntry.offset + primaryDataObject.offset,
              ),
              dataType: "pointer",
            },
            dataType: primaryDataObject.dataType,
          })),
        };
      }
    } else if (expr.type === "AddressOfExpression") {
      if (expr.expr.type === "IdentifierExpression") {
        // taking the address of a symbol - could be a variable or function
        const identifier = expr.expr.name;
        const symbolEntry = symbolTable.getSymbolEntry(identifier);
        if (symbolEntry.type === "function") {
          return createFunctionTableIndexExpressionWrapper(
            expr.expr.name,
            symbolEntry.dataType,
            symbolTable,
          );
        }

        if (
          symbolEntry.type === "enumerator" ||
          !isLValue(expr.expr, symbolEntry.dataType, symbolTable, true)
        ) {
          throw new ProcessingError("lvalue required as unary '&' operand");
        }

        // If function pointer, dont increase the pointer nesting, just return processed identifier expression
        if (isFunctionPointer(symbolEntry.dataType)) {
          return processExpression(expr.expr, symbolTable, enclosingFunc);
        }

        return {
          originalDataType: {
            type: "pointer",
            pointeeType: symbolEntry.dataType,
          },
          exprs: [
            {
              type:
                symbolEntry.type === "dataSegmentVariable"
                  ? "DataSegmentAddress"
                  : "LocalAddress",
              offset: createMemoryOffsetIntegerConstant(symbolEntry.offset),
              dataType: "pointer",
            },
          ],
        };
      } else if (expr.expr.type === "PointerDereference") {
        return processExpression(expr.expr.expr, symbolTable); // simply return the expression within the deref expression (& cancels *)
      } else {
        throw new ProcessingError("lvalue required for unary '&' operand");
      }
    } else if (expr.type === "PointerDereference") {
      // process the expression being dereferenced first
      const derefedExpression = processExpression(expr.expr, symbolTable);
      const derefedExpressionDataType = getDataTypeOfExpression({
        expression: derefedExpression,
        convertArrayToPointer: true,
        convertFunctionToPointer: true,
      });
      if (derefedExpressionDataType.type !== "pointer") {
        throw new ProcessingError(`cannot dereference non-pointer type`);
      }

      if (isVoidPointer(derefedExpressionDataType)) {
        addWarning("dereferencing void pointer", expr.position);
        return {
          originalDataType: derefedExpressionDataType.pointeeType,
          exprs: [],
        };
      }

      // if the derefed expression a function pointer, it remains one
      if (isFunctionPointer(derefedExpressionDataType)) {
        return derefedExpression;
      }

      if (
        derefedExpressionDataType.pointeeType.type === "primary" ||
        derefedExpressionDataType.pointeeType.type === "pointer"
      ) {
        return {
          originalDataType: derefedExpressionDataType.pointeeType,
          exprs: [
            {
              type: "MemoryLoad",
              address: {
                type: "DynamicAddress",
                address: derefedExpression.exprs[0],
                dataType: "pointer",
              },
              dataType:
                derefedExpressionDataType.pointeeType.type === "pointer"
                  ? "pointer"
                  : derefedExpressionDataType.pointeeType.primaryDataType,
            },
          ],
        };
      } else if (derefedExpressionDataType.pointeeType.type === "array") {
        // the resultant data type of the whole dereference expression should be pointer to the array element type, as arrays are treated as pointers
        return {
          originalDataType: derefedExpressionDataType.pointeeType,
          exprs: [
            {
              type: "DynamicAddress",
              address: derefedExpression.exprs[0],
              dataType: "pointer",
            },
          ],
        };
      } else {
        const unpackedStruct = unpackDataType(
          derefedExpressionDataType.pointeeType,
        );
        return {
          originalDataType: derefedExpressionDataType.pointeeType,
          exprs: unpackedStruct.map((primaryDataObject) => ({
            type: "MemoryLoad",
            address: {
              type: "DynamicAddress",
              address: {
                type: "BinaryExpression",
                leftExpr: derefedExpression.exprs[0], // value of dereferenced expression (starting address of the pointed to struct)
                rightExpr: createMemoryOffsetIntegerConstant(
                  primaryDataObject.offset,
                ), // offset of particular primary data object in struct
                operator: "+",
                operandTargetDataType: "pointer",
                dataType: "pointer",
              },
              dataType: "pointer",
            },
            dataType: primaryDataObject.dataType,
          })),
        };
      }
    } else if (expr.type === "SizeOfExpression") {
      let dataTypeToGetSizeOf;

      if (expr.subtype === "expression") {
        // sizeof used on expression
        dataTypeToGetSizeOf = getDataTypeOfExpression({
          expression: processExpression(expr.expr, symbolTable),
        });
      } else {
        // sizeof used on datatype
        dataTypeToGetSizeOf = expr.dataType;
      }

      // check constraints are met as per 6.5.3.4/1 of C17 standard
      // incomplete pointer check already done at parser

      if (dataTypeToGetSizeOf.type === "function") {
        throw new ProcessingError(
          "invalid application of 'sizeof' to function type",
        );
      }

      return {
        originalDataType: {
          type: "primary",
          primaryDataType: SIZE_T,
        },
        exprs: [
          {
            type: "IntegerConstant",
            value: BigInt(getDataTypeSize(dataTypeToGetSizeOf)),
            dataType: SIZE_T,
          },
        ],
      };
    } else if (expr.type === "StructMemberAccess") {
      const processedExpr = processExpression(expr.expr, symbolTable); // process the underlying expression being operated on
      const dataTypeOfExpr = getDataTypeOfExpression({
        expression: processedExpr,
        convertArrayToPointer: true,
        convertFunctionToPointer: true,
      });
      if (dataTypeOfExpr.type !== "struct") {
        throw new ProcessingError(
          `request for member '${expr.fieldTag}' in something that is not a structure`,
        );
      }
      const { fieldIndex, fieldDataType } =
        determineIndexAndDataTypeOfFieldInStruct(dataTypeOfExpr, expr.fieldTag);
      if (fieldDataType.type === "array") {
        // treat array field as just a pointer
        const dataTypeOfPointer: PointerDataType = {
          type: "pointer",
          pointeeType: fieldDataType.elementDataType,
        };

        if (processedExpr.exprs[0].type === "PreStatementExpression") {
          // handle special case of accessing struct field of a returned struct from function call
          // the prestaetments need to be incorporated, even if the first primary expression (exprs[0]) is not
          let memoryLoadExpr: MemoryLoad; // the memoryload that the pointer value is being derived from
          if (fieldIndex === 0) {
            const memLoad = processedExpr.exprs[0].expr;
            if (memLoad.type !== "MemoryLoad") {
              throw new ProcessingError(
                `request for member '${expr.fieldTag}' in something that is not a structure or union`,
              );
            }
            memoryLoadExpr = memLoad;
          } else {
            const memLoad = processedExpr.exprs[fieldIndex];
            if (memLoad.type !== "MemoryLoad") {
              throw new ProcessingError(
                `request for member '${expr.fieldTag}' in something that is not a structure or union`,
              );
            }
            memoryLoadExpr = memLoad;
          }
          return {
            originalDataType: dataTypeOfPointer,
            exprs: [
              {
                type: "PreStatementExpression",
                statements: processedExpr.exprs[0].statements,
                expr: {
                  type: "DynamicAddress",
                  address: memoryLoadExpr.address,
                  dataType: "pointer",
                },
                dataType: "pointer",
              },
            ],
          };
        }

        return {
          originalDataType: {
            type: "pointer",
            pointeeType: fieldDataType.elementDataType,
          },
          exprs: [
            {
              type: "DynamicAddress",
              address: (processedExpr.exprs[fieldIndex] as MemoryLoad).address,
              dataType: "pointer",
            },
          ],
        };
      } else {
        // procssedExpr already consists of accessing the whole struct (all primary memory object loads)
        // just use field index to access the right ones
        const memoryLoadExprs: (MemoryLoad | PreStatementExpressionP)[] = [];
        let totalBytesLoaded = 0;
        let currLoadIndex = fieldIndex;

        if (processedExpr.exprs[0].type === "PreStatementExpression") {
          // special case - if the first expression is a prestatement, then it is probably a function call, need to make sure that the statements from the prestatement are included
          const loadExpr = processedExpr.exprs[currLoadIndex++];
          if (loadExpr.type === "PreStatementExpression") {
            // fieldIndex could be 0, so loadExpr and exprs[0] could be the same prestatementexpression
            memoryLoadExprs.push(loadExpr);
            totalBytesLoaded += getSizeOfScalarDataType(loadExpr.expr.dataType);
          } else if (loadExpr.type === "MemoryLoad") {
            memoryLoadExprs.push({
              type: "PreStatementExpression",
              statements: processedExpr.exprs[0].statements,
              expr: loadExpr,
              dataType: loadExpr.dataType,
            });
            totalBytesLoaded += getSizeOfScalarDataType(loadExpr.dataType);
          } else {
            throw new ProcessingError(
              `request for member '${expr.fieldTag}' in something that is not a structure or union`,
            );
          }
        }

        while (totalBytesLoaded < getDataTypeSize(fieldDataType)) {
          if (processedExpr.exprs[currLoadIndex].type !== "MemoryLoad") {
            // only "MemoryLoads" can possibly indicate an lvalue
            throw new ProcessingError(
              `request for member '${expr.fieldTag}' in something that is not a structure or union`,
            );
          }
          totalBytesLoaded += getSizeOfScalarDataType(
            (processedExpr.exprs[currLoadIndex] as MemoryLoad).dataType,
          );
          memoryLoadExprs.push(
            processedExpr.exprs[currLoadIndex++] as MemoryLoad,
          );
        }
        return {
          originalDataType:
            fieldDataType.type === "struct self pointer"
              ? { type: "pointer", pointeeType: dataTypeOfExpr } // datatype is a pointer to the struct itself
              : fieldDataType,
          exprs: memoryLoadExprs,
        };
      }
    } else if (expr.type === "CommaSeparatedExpressions") {
      // only last expression becomes a true Expression (one where a value is expected)
      // process the first expressions as statements
      const processedLastExpr = processExpression(
        expr.expressions[expr.expressions.length - 1],
        symbolTable,
      );
      const precedingExpressionsAsStatements: StatementP[] = [];
      for (let i = 0; i < expr.expressions.length - 1; ++i) {
        precedingExpressionsAsStatements.push(
          ...processBlockItem(
            expr.expressions[i],
            symbolTable,
            enclosingFunc as FunctionDefinitionP,
          ),
        );
      }
      return {
        originalDataType: processedLastExpr.originalDataType,
        exprs: [
          {
            type: "PreStatementExpression",
            statements: precedingExpressionsAsStatements,
            expr: processedLastExpr.exprs[0],
            dataType: processedLastExpr.exprs[0].dataType,
          },
          ...processedLastExpr.exprs.slice(1),
        ],
      };
    } else if (expr.type === "ConditionalExpression") {
      const processedCondition = processExpression(
        expr.condition,
        symbolTable,
        enclosingFunc,
      );
      const processedTrueExpression = processExpression(
        expr.trueExpression,
        symbolTable,
      );
      const dataTypeOfTrueExpression = getDataTypeOfExpression({
        expression: processedTrueExpression,
        convertArrayToPointer: true,
        convertFunctionToPointer: true,
      });
      const processedFalseExpression = processExpression(
        expr.falseExpression,
        symbolTable,
      );
      const dataTypeOfFalseExpression = getDataTypeOfExpression({
        expression: processedFalseExpression,
        convertArrayToPointer: true,
        convertFunctionToPointer: true,
      });

      checkConditionalExpressionOperands(
        processedCondition,
        processedTrueExpression,
        processedFalseExpression,
      );

      const resultDataType = determineConditionalExpressionDataType(
        dataTypeOfTrueExpression,
        dataTypeOfFalseExpression,
      );

      return {
        originalDataType: resultDataType,
        exprs: processedTrueExpression.exprs.map((truePrimaryExpr, index) => ({
          type: "ConditionalExpression",
          condition: processedCondition.exprs[0],
          trueExpression: truePrimaryExpr,
          falseExpression: processedFalseExpression.exprs[index],
          dataType:
            resultDataType.type === "primary"
              ? resultDataType.primaryDataType
              : resultDataType.type === "pointer"
              ? "pointer"
              : truePrimaryExpr.dataType,
        })),
      };
    } else if (expr.type === "StringLiteral") {
      // allocate the string in datasegment
      const dataSegmentOffset = symbolTable.addDataSegmentObject(expr.chars);
      return {
        originalDataType: {
          type: "pointer",
          pointeeType: {
            type: "primary",
            primaryDataType: "signed char",
          },
        },
        exprs: [
          {
            type: "DataSegmentAddress",
            offset: createMemoryOffsetIntegerConstant(dataSegmentOffset),
            dataType: "pointer",
          },
        ],
      };
    } else {
      // this should not happen
      throw new ProcessingError(`unhandled Expression: ${toJson(expr)}`);
    }
  } catch (e) {
    if (e instanceof ProcessingError && e.position === null) {
      e.addPositionInfo(expr.position);
    }
    throw e;
  }
}
