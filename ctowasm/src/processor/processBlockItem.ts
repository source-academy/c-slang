/**
 * Definition of visitor function for statements.
 */

import { SymbolTable } from "~src/processor/symbolTable";

import { ProcessingError, toJson } from "~src/errors";

import { StatementP } from "~src/processor/c-ast/core";
import { FunctionDefinitionP } from "~src/processor/c-ast/function";
import { getDataTypeOfExpression, processCondition } from "~src/processor/util";
import {
  convertFunctionCallToFunctionCallP,
  processFunctionReturnStatement,
} from "./processFunctionDefinition";
import { ForLoopP } from "~src/processor/c-ast/statement/iterationStatement";
import { getAssignmentNodes } from "~src/processor/lvalueUtil";
import { BlockItem } from "~src/parser/c-ast/core";
import {
  determineOperandTargetDataTypeOfBinaryExpression,
  determineResultDataTypeOfBinaryExpression,
  getArithmeticPrePostfixExpressionNodes,
} from "~src/processor/expressionUtil";
import { processLocalDeclaration } from "~src/processor/processDeclaration";
import processExpression from "~src/processor/processExpression";
import { isIntegralDataType } from "~src/processor/dataTypeUtil";
import { SwitchStatementCaseP } from "~src/processor/c-ast/statement/selectionStatement";
import evaluateCompileTimeExpression from "~src/processor/evaluateCompileTimeExpression";
import { IntegerDataType, PrimaryCDataType } from "~src/common/types";
import { addWarning } from "~src/processor/warningUtil";
import { PrimaryDataType, ScalarDataType } from "~dist";

/**
 * Visitor function for traversing C Statement AST nodes.
 * This function is to be used to process any node that is used in a context where it is expected to correspond
 * to a statement - i.e an action that occurs.
 * Thus it can process Expression types as well, specifically expressions which have side effects.
 * @param ast
 * @param sourceCode
 */
export default function processBlockItem(
  node: BlockItem,
  symbolTable: SymbolTable,
  enclosingFunc: FunctionDefinitionP,
): StatementP[] {
  try {
    if (node.type === "Block") {
      const blockSymbolTable = new SymbolTable(symbolTable);
      const statements: StatementP[] = [];
      node.statements.forEach((child) => {
        const result = processBlockItem(child, blockSymbolTable, enclosingFunc);
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
      let clause: StatementP[];
      let forLoopSymbolTable = symbolTable;
      if (node.clause !== null && node.clause.type === "Declaration") {
        // create new scope for this declaration
        forLoopSymbolTable = new SymbolTable(symbolTable);
        clause = [];
        for (const declaration of node.clause.value) {
          clause.push(
            ...processLocalDeclaration(
              declaration,
              forLoopSymbolTable,
              enclosingFunc,
            ),
          );
        }
      } else if (node.clause !== null && node.clause.type === "Expression") {
        clause = processBlockItem(
          node.clause.value,
          forLoopSymbolTable,
          enclosingFunc,
        );
      } else {
        clause = [];
      }

      const processedForLoopNode: ForLoopP = {
        type: "ForLoop",
        clause,
        condition:
          node.condition !== null
            ? processCondition(node.condition, forLoopSymbolTable)
            : null,
        update:
          node.update !== null
            ? processBlockItem(node.update, forLoopSymbolTable, enclosingFunc)
            : [],
        body: processBlockItem(node.body, forLoopSymbolTable, enclosingFunc),
      };

      return [processedForLoopNode];
    } else if (node.type === "DoWhileLoop" || node.type === "WhileLoop") {
      return [
        {
          type: node.type,
          condition: processCondition(node.condition, symbolTable),
          body: processBlockItem(node.body, symbolTable, enclosingFunc), // processing a block always gives array of statements
        },
      ];
    } else if (node.type === "ReturnStatement") {
      // there must be an enclosing func
      if (typeof enclosingFunc === "undefined") {
        throw new ProcessingError(
          "return statement is not valid outside of a function",
          node.position,
        );
      }

      if (typeof node.value === "undefined") {
        return [
          {
            type: "ReturnStatement",
          },
        ];
      }

      // there is an expression to return, break up the return into series of memory stores of the expression
      // in the return memory object locations
      return processFunctionReturnStatement(node.value, symbolTable);
    } else if (node.type === "SelectionStatement") {
      return [
        {
          type: "SelectionStatement",
          condition: processCondition(node.condition, symbolTable),
          ifStatements: processBlockItem(
            node.ifStatement,
            symbolTable,
            enclosingFunc,
          ),
          elseStatements: node.elseStatement
            ? processBlockItem(node.elseStatement, symbolTable, enclosingFunc)
            : null,
        },
      ];
    } else if (
      node.type === "BreakStatement" ||
      node.type === "ContinueStatement"
    ) {
      return [
        {
          type: node.type,
        },
      ];
      // start of processing Expression nodes which may have side effects
    } else if (node.type === "SwitchStatement") {
      const processedTargetExpression = processExpression(
        node.targetExpression,
        symbolTable,
      );
      const dataTypeOfTargetExpression = getDataTypeOfExpression({
        expression: processedTargetExpression,
      });
      if (!isIntegralDataType(dataTypeOfTargetExpression)) {
        throw new ProcessingError("switch quantity is not an integer");
      }
      const processedCases: SwitchStatementCaseP[] = [];
      for (const switchStatementCase of node.cases) {
        const dataTypeOfLabel = getDataTypeOfExpression({expression: processExpression(switchStatementCase.conditionMatch, symbolTable, enclosingFunc)});
        if (!isIntegralDataType(dataTypeOfLabel)) {
          throw new ProcessingError("case label does not reduce to an integer constant");
        }
        const evaluatedConstant = evaluateCompileTimeExpression(
          switchStatementCase.conditionMatch,
        );
        // TODO: refine error message if not compile time expression
        const processedStatements: StatementP[] = [];
        for (const statement of switchStatementCase.statements) {
          processedStatements.push(
            ...processBlockItem(statement, symbolTable, enclosingFunc),
          );
        }
        // the conditon of each switch case is adjusted to be a relational expression: targetExpression == case value
        const dataTypeOfSwitchCaseOperandAndTarget = (determineResultDataTypeOfBinaryExpression(
          dataTypeOfTargetExpression as PrimaryDataType,
          dataTypeOfLabel as PrimaryDataType,
          "==",
        ) as PrimaryDataType).primaryDataType;
        processedCases.push({
          condition: {
            type: "BinaryExpression",
            leftExpr: processedTargetExpression.exprs[0],
            rightExpr: evaluatedConstant,
            operator: "==",
            operandTargetDataType: dataTypeOfSwitchCaseOperandAndTarget,
            dataType: dataTypeOfSwitchCaseOperandAndTarget,
          },
          statements: processedStatements,
        });
      }
      const processedDefaultStatements: StatementP[] = [];
      for (const defaultStatement of node.defaultStatements) {
        processedDefaultStatements.push(
          ...processBlockItem(defaultStatement, symbolTable, enclosingFunc),
        );
      }
      return [
        {
          type: "SwitchStatement",
          targetExpression: processedTargetExpression.exprs[0], // since processedtargetexpression has integer type, only has one primary data expression
          cases: processedCases,
          defaultStatements: processedDefaultStatements,
        },
      ];
    } else if (node.type === "Assignment") {
      return getAssignmentNodes(node, symbolTable).memoryStoreStatements;
    } else if (node.type === "FunctionCall") {
      // in this context, the return (if any) of the functionCall is ignored, as it is used as a statement
      return [
        convertFunctionCallToFunctionCallP(node, symbolTable).functionCallP,
      ];
    } else if (
      node.type === "PrefixExpression" ||
      node.type === "PostfixExpression"
    ) {
      if (node.operator === "++" || node.operator === "--") {
        // only increment and decrement expressions become statements
        return getArithmeticPrePostfixExpressionNodes(node, symbolTable)
          .storeNodes;
      } else {
        processExpression(node, symbolTable, enclosingFunc);
        return [];
      }
    } else if (node.type === "CommaSeparatedExpressions") {
      const processedExpressions: StatementP[] = [];
      node.expressions.forEach((e) => {
        processedExpressions.push(
          ...processBlockItem(e, symbolTable, enclosingFunc),
        );
      });
      return processedExpressions;
    } else if (node.type === "ConditionalExpression") {
      processExpression(node, symbolTable, enclosingFunc);
      // break this conditional into a simple if else expression (expressions inside condtional may have side effects)
      return [
        {
          type: "SelectionStatement",
          condition: processCondition(node.condition, symbolTable),
          ifStatements: processBlockItem(
            node.trueExpression,
            symbolTable,
            enclosingFunc,
          ),
          elseStatements: processBlockItem(
            node.falseExpression,
            symbolTable,
            enclosingFunc,
          ),
        },
      ];
    } else if (
      node.type === "AddressOfExpression" ||
      node.type === "BinaryExpression" ||
      node.type === "FloatConstant" ||
      node.type === "IntegerConstant" ||
      node.type === "IdentifierExpression" ||
      node.type === "PointerDereference" ||
      node.type === "SizeOfExpression" ||
      node.type === "StructMemberAccess" 
    ) {
      addWarning("statement with no effect", node.position);
      processExpression(node, symbolTable, enclosingFunc);
      // all these expression statements can be safely ignored as they have no side effects
      return [];
    } else if (node.type === "StringLiteral") {
      addWarning("statement with no effect", node.position);
      return [];
    } else if (node.type === "Declaration" || node.type === "EnumDeclaration") {
      return processLocalDeclaration(node, symbolTable, enclosingFunc);
    } else {
      throw new ProcessingError(`unhandled C AST node: ${toJson(node)}`);
    }
  } catch (e) {
    if (e instanceof ProcessingError && e.position === null) {
      e.addPositionInfo(node.position);
    }
    throw e;
  }
}
