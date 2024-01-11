import { ProcessingError, UnsupportedFeatureError, toJson } from "~src/errors";
import { Declaration, Initializer } from "~src/parser/c-ast/declaration";
import { ExpressionP, StatementP } from "~src/processor/c-ast/core";
import { FunctionDefinitionP } from "~src/processor/c-ast/function";
import { getDataTypeSize, unpackDataType } from "~src/processor/dataTypeUtil";
import { SymbolTable, VariableSymbolEntry } from "~src/processor/symbolTable";
import processExpression from "~src/processor/processExpression";
import {
  FloatDataType,
  IntegerDataType,
  ScalarCDataType,
} from "~src/common/types";
import { isFloatType } from "~src/common/utils";
import { MemoryStore } from "~src/processor/c-ast/memory";
import { createMemoryOffsetIntegerConstant } from "~src/processor/util";
import evaluateCompileTimeExpression from "~src/processor/evaluateCompileTimeExpression";
import { ArrayDataType } from "~src/parser/c-ast/dataTypes";
import { ConstantP } from "~src/processor/c-ast/expression/constants";

/**
 * Processes a Declaration node.
 * Adds the symbol to the symbolTable, and returns any memory store nodes needed for initialization, if any.
 */
export default function processDeclaration(
  node: Declaration,
  symbolTable: SymbolTable,
  enclosingFunc?: FunctionDefinitionP // reference to enclosing function, if any
): StatementP[] {
  try {
    let symbolEntry = symbolTable.addEntry(node);
    if (node.dataType.type === "function") {
      return [];
    }

    if (typeof enclosingFunc !== "undefined") {
      enclosingFunc.sizeOfLocals += getDataTypeSize(node.dataType);
    }

    symbolEntry = symbolEntry as VariableSymbolEntry; // definitely not dealing with a function declaration already

    if (typeof node.initializer !== "undefined") {
      const memoryStoreStatements: MemoryStore[] = [];

      const unpackedInitializerExpressions = unpackInitializer(
        node.initializer,
        symbolTable
      );

      const unpackedDataType = unpackDataType(node.dataType);

      if (unpackedInitializerExpressions.length > unpackDataType.length) {
        throw new ProcessingError(
          `Excess elements in ${
            node.dataType.type === "pointer" || node.dataType.type === "primary"
              ? "scalar"
              : node.dataType.type === "array"
              ? "array"
              : "aggregate"
          } intializer`,
          node.position
        );
      }

      let i = 0;
      for (; i < unpackedInitializerExpressions.length; ++i) {
        const primaryDataObject = unpackedDataType[i];
        memoryStoreStatements.push({
          type: "MemoryStore",
          address: {
            type: symbolEntry.type === "localVariable" ? "LocalAddress" : "DataSegmentAddress",
            offset: createMemoryOffsetIntegerConstant(primaryDataObject.offset),
            dataType: primaryDataObject.dataType
          },
          value: unpackedInitializerExpressions[i],
          dataType: primaryDataObject.dataType

        })
      } 

      for (let j = i; j < unpackedDataType.length; ++j) {
        // set the rest of the data types to 0, since they are not set
        const primaryDataObject = unpackedDataType[j];
        
        let zeroExpression: ConstantP;
        if (isFloatType(primaryDataObject.dataType)) {
          zeroExpression =  {
            type: "FloatConstant",
            value: 0,
            dataType: primaryDataObject.dataType as FloatDataType
          }
        } else {
          zeroExpression = {
            type: "IntegerConstant",
            value: 0n,
            dataType: primaryDataObject.dataType as IntegerDataType
          }
        }

        memoryStoreStatements.push({
          type: "MemoryStore",
          address: {
            type: symbolEntry.type === "globalVariable" ? "DataSegmentAddress" : "LocalAddress",
            offset: createMemoryOffsetIntegerConstant(primaryDataObject.offset),
            dataType: primaryDataObject.dataType
          },
          value: zeroExpression,
          dataType: primaryDataObject.dataType

        })
      }
      return memoryStoreStatements;
    } else {
      return [];
    }
  } catch (e) {
    if (e instanceof ProcessingError) {
      e.addPositionInfo(node.position);
    }
    throw e;
  }
}

/**
 * Unpacks an Initializer into an array of PrimaryDataTypeExpressionP.
 */

function unpackInitializer(
  intializer: Initializer,
  symbolTable: SymbolTable
): ExpressionP[] {
  const expressions: ExpressionP[] = [];
  function helper(initializer: Initializer) {
    if (initializer.type === "InitializerSingle") {
      const expr = processExpression(initializer.value, symbolTable);
      expr.exprs.forEach((e) => expressions.push(e));
    } else {
      // visit all the sub initializers of this intializer list
      initializer.values.forEach((init) => helper(init));
    }
  }
  helper(intializer);
  return expressions;
}
