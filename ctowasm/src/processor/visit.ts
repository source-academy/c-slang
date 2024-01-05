/**
 * Definition of visitor function.
 */

import { BlockStatement, isExpression } from "~src/parser/c-ast/core";
import { SymbolTable, VariableSymbolEntry } from "~src/processor/symbolTable";

import { ProcessingError, toJson } from "~src/errors";

import { StatementP } from "~src/processor/c-ast/core";
import { FunctionDefinitionP } from "~src/processor/c-ast/function";
import { MemoryObjectDetail, MemoryStore } from "./c-ast/memory";
import {
  checkFunctionNodeExprIsCallable,
  createMemoryOffsetIntegerConstant,
  processCondition,
  runPrefixPostfixArithmeticChecks,
} from "~src/processor/util";
import {
  processFunctionCallArgs,
  processFunctionReturnStatement,
} from "./functionUtil";
import { processConditionalBlock } from "./util";
import { ForLoopP } from "~src/processor/c-ast/loops";
import {
  getAssignmentMemoryStoreNodes,
  unpackDataTypeIntoPrimaryDataMemoryObjects,
  unpackInitializer,
} from "~src/processor/variableUtil";
import { pointerPrimaryDataType } from "~src/common/constants";
import { isFloatType } from "~src/common/utils";
import { FloatDataType, IntegerDataType } from "~src/common/types";

/**
 * Visitor function for traversing the C AST to process C AST.
 * Returns the processed CNode.
 * @param ast
 * @param sourceCode
 */
export function visit(
  sourceCode: string,
  node: BlockStatement,
  symbolTable: SymbolTable,
  enclosingFunc?: FunctionDefinitionP // reference to enclosing function, if any
): StatementP | StatementP[] | null {
  if (node.type === "Block") {
    const blockSymbolTable = new SymbolTable(symbolTable);
    const statements: StatementP[] = [];
    node.children.forEach((child) => {
      const result = visit(sourceCode, child, blockSymbolTable, enclosingFunc);
      if (result === null) {
        return;
      } else if (Array.isArray(result)) {
        // A block was visited, returning an array of StatementP
        result.forEach((statement) => statements.push(statement));
      } else {
        statements.push(result);
      }
    });
    return statements;
  } else if (node.type === "ForLoop") {
    // for loops have a specific scope for the for loop bracketed statements e.g. "(int i = 0; i < 10; i++)"
    const forLoopSymbolTable = new SymbolTable(symbolTable);
    const processedForLoopNode: ForLoopP = {
      type: "ForLoop",
      initialization: visit(
        sourceCode,
        node.initialization,
        forLoopSymbolTable,
        enclosingFunc
      ) as StatementP,
      condition: processCondition(sourceCode, node.condition, symbolTable),
      update: visit(
        sourceCode,
        node.update,
        forLoopSymbolTable,
        enclosingFunc
      ) as StatementP,
      body: visit(
        sourceCode,
        node.body,
        forLoopSymbolTable,
        enclosingFunc
      ) as StatementP[],
    };
    return processedForLoopNode;
  } else if (node.type === "DoWhileLoop" || node.type === "WhileLoop") {
    return {
      type: node.type,
      condition: processCondition(sourceCode, node.condition, symbolTable),
      body: visit(
        sourceCode,
        node.body,
        symbolTable,
        enclosingFunc
      ) as StatementP[], // processing a block always gives array of statements
    };
  } else if (node.type === "ReturnStatement") {
    // there must be an enclosing func
    if (typeof enclosingFunc === "undefined") {
      throw new ProcessingError(
        "Return statement is not valid outside of a function"
      );
    }

    if (typeof node.value === "undefined" || node === null) {
      return {
        type: "ReturnStatement",
      };
    }

    // there is an expression to return, break up the return into series of memory stores of the expression
    // in the return memory object locations
    return processFunctionReturnStatement(
      sourceCode,
      node.value,
      enclosingFunc.returnMemoryDetails as MemoryObjectDetail[],
      symbolTable
    );
  } else if (node.type === "SelectStatement") {
    return {
      type: "SelectStatement",
      ifBlock: processConditionalBlock(
        sourceCode,
        node.ifBlock,
        symbolTable,
        enclosingFunc
      ),
      elseIfBlocks: node.elseIfBlocks.map((block) =>
        processConditionalBlock(sourceCode, block, symbolTable, enclosingFunc)
      ),
      elseBody: node.elseBlock
        ? (visit(
            sourceCode,
            node.elseBlock,
            symbolTable,
            enclosingFunc
          ) as StatementP[])
        : null,
    };
  } else if (node.type === "Assignment") {
    return getAssignmentMemoryStoreNodes(sourceCode, node, symbolTable);
  } else if (node.type === "FunctionDeclaration") {
    symbolTable.addFunctionEntry(
      node.name,
      node.parameters.map((p) => p.dataType),
      node.returnType
    );
    return null; // no processed node to return
  } else if (node.type === "VariableDeclaration") {
    symbolTable.addVariableEntry(node.name, node.dataType);
    return null;
  } else if (node.type === "FunctionCallStatement") {
    checkFunctionNodeExprIsCallable(node);
    //TODO: add function pointer support
    return {
      type: "FunctionCall",
      calledFunction: {
        type: "FunctionName",
        name: node.expr.name
      },
      args: processFunctionCallArgs(sourceCode, node.args, symbolTable),
    };
  } else if (node.type === "Initialization") {
    const symbolEntry = symbolTable.addVariableEntry(node.name, node.dataType);
    const unpackedInitializerExpressions = unpackInitializer(
      sourceCode,
      node.initializer,
      symbolTable
    );
    if (node.dataType.type === "primary" || node.dataType.type === "pointer") {
      if (unpackedInitializerExpressions.length > 1) {
        throw new ProcessingError(
          "Excess elements in scalar initializer",
          sourceCode,
          node.position
        );
      }
      return {
        type:
          symbolEntry.type === "localVariable"
            ? "LocalObjectMemoryStore"
            : "DataSegmentObjectMemoryStore",
        dataType:
          node.dataType.type === "primary"
            ? node.dataType.primaryDataType
            : pointerPrimaryDataType,
        value: unpackedInitializerExpressions[0],
        offset: createMemoryOffsetIntegerConstant(symbolEntry.offset),
      };
    } else if (
      node.dataType.type === "array" ||
      node.dataType.type === "struct" ||
      node.dataType.type === "typedef"
    ) {
      const memoryStoreStatements: MemoryStore[] = [];
      // unpack the aggregate data type into series of primary data type memory objects
      const primaryMemoryObjects = unpackDataTypeIntoPrimaryDataMemoryObjects(
        node.dataType
      );
      let i = 0;
      for (; i < unpackedInitializerExpressions.length; ++i) {
        memoryStoreStatements.push({
          type:
            symbolEntry.type === "localVariable"
              ? "LocalObjectMemoryStore"
              : "DataSegmentObjectMemoryStore",
          dataType: primaryMemoryObjects[i].primaryDataType,
          offset: createMemoryOffsetIntegerConstant(
            primaryMemoryObjects[i].offset
          ),
          value: unpackedInitializerExpressions[i],
        });
      }

      // fill in the rest with zero constants TODO: check if correct for typdef
      for (let j = i; i < memoryStoreStatements.length; ++j) {
        memoryStoreStatements.push({
          type:
            symbolEntry.type === "localVariable"
              ? "LocalObjectMemoryStore"
              : "DataSegmentObjectMemoryStore",
          dataType: primaryMemoryObjects[j].primaryDataType,
          offset: createMemoryOffsetIntegerConstant(
            primaryMemoryObjects[j].offset
          ),
          value: isFloatType(primaryMemoryObjects[j].primaryDataType)
            ? {
                type: "FloatConstant",
                value: 0,
                dataType: primaryMemoryObjects[j]
                  .primaryDataType as FloatDataType,
              }
            : {
                type: "IntegerConstant",
                value: 0n,
                dataType: primaryMemoryObjects[j]
                  .primaryDataType as IntegerDataType,
              },
        });
      }
      return memoryStoreStatements;
    } else {
      throw new ProcessingError(
        `Unhandled data type: ${toJson(node.dataType)}`
      );
    }
    // handle the unpacking of the data type here -> make utility function
  } else if (
    node.type === "PrefixArithmeticExpression" ||
    node.type === "PostfixArithmeticExpression"
  ) {
    // simple assignment
    const symbolEntry = symbolTable.getSymbolEntry(
      node.expr.name
    ) as VariableSymbolEntry;
    runPrefixPostfixArithmeticChecks(symbolEntry, sourceCode, node.position);

    return {
      type:
        symbolEntry.type === "localVariable"
          ? "LocalObjectMemoryStore"
          : "DataSegmentObjectMemoryStore",
      offset: {
        type: "IntegerConstant",
        value: BigInt(symbolEntry.offset),
        dataType: pointerPrimaryDataType,
      },
      dataType:
        symbolEntry.dataType.type === "primary"
          ? symbolEntry.dataType.primaryDataType
          : pointerPrimaryDataType,
      value: {
        type: "IntegerConstant",
        value: 1n,
        dataType: pointerPrimaryDataType, // can be any type, since it is just 1
      },
    };
  } else if (isExpression(node)) {
    // ignore all other expressions other than pre/postfix arithmetic, they do not have side effects and can be safely ignored
    return null;
  } else {
    throw new ProcessingError(
      `Unhandled C AST node: ${toJson(node)}`,
      sourceCode,
      node.position
    );
  }
}
