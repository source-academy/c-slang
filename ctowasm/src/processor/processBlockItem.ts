/**
 * Definition of visitor function for statements.
 */

import { SymbolTable } from "~src/processor/symbolTable";

import { ProcessingError, toJson } from "~src/errors";

import { ExpressionP, StatementP } from "~src/processor/c-ast/core";
import { FunctionDefinitionP } from "~src/processor/c-ast/function";
import { processCondition } from "~src/processor/util";
import { processFunctionReturnStatement } from "./functionUtil";
import { ForLoopP } from "~src/processor/c-ast/statement/iterationStatement";
import { getAssignmentMemoryStoreNodes } from "~src/processor/lvalueUtil";
import processExpression from "~src/processor/processExpression";
import { BlockItem, Statement } from "~src/parser/c-ast/core";
import processDeclaration from "~src/processor/processDeclaration";
import { getArithmeticPrePostfixExpressionNodes } from "~src/processor/expressionUtil";

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
  enclosingFunc?: FunctionDefinitionP // reference to enclosing function, if any
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
        clause = processDeclaration(node.clause.value, forLoopSymbolTable);
      } else if (node.clause !== null && node.clause.type === "Expression") {
        clause = processBlockItem(node.clause.value, forLoopSymbolTable);
      } else {
        clause = [];
      }

      const processedForLoopNode: ForLoopP = {
        type: "ForLoop",
        clause,
        condition: processCondition(node.condition, symbolTable),
        update: processBlockItem(
          node.update,
          forLoopSymbolTable,
          enclosingFunc
        ),
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
          "Return statement is not valid outside of a function",
          node.position
        );
      }

      if (typeof node.value === "undefined") {
        return [
          {
            type: "ReturnStatement",
          },
        ];
      }

      if (enclosingFunc.returnMemoryDetails === null) {
        throw new ProcessingError(
          `Cannot return an expression from function with no defined return type`,
          node.position
        );
      }

      // there is an expression to return, break up the return into series of memory stores of the expression
      // in the return memory object locations
      return processFunctionReturnStatement(
        node.value,
        enclosingFunc.returnMemoryDetails,
        symbolTable
      );
    } else if (node.type === "SelectionStatement") {
      return [
        {
          type: "SelectionStatement",
          condition: processCondition(node.condition, symbolTable),
          ifStatements: processBlockItem(node.ifStatement, symbolTable),
          elseStatements: node.elseStatement
            ? processBlockItem(node.elseStatement, symbolTable)
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
    } else if (node.type === "Assignment") {
      return getAssignmentMemoryStoreNodes(node, symbolTable);
    } else if (node.type === "FunctionCall") {
      // in this context, the return (if any) of the functionCall is ignored, as it is used as a statement
      if (node.expr.type === "IdentifierExpression") {
        const symbolEntry = symbolTable.getSymbolEntry(node.expr.name);
        if (symbolEntry.dataType.type !== "function") {
          throw new ProcessingError(
            `Called object '${node.expr.name}' is neither a function nor function pointer`
          );
        }
        return [
          {
            type: "FunctionCall",
            calledFunction: {
              type: "FunctionName",
              name: node.expr.name,
            },
            args: node.args.reduce(
              (prv, expr) =>
                prv.concat(processExpression(expr, symbolTable).exprs),
              [] as ExpressionP[]
            ),
          },
        ];
      } else {
        throw new ProcessingError(
          `Called expression is neither a function nor function pointer`,
          node.position
        );
      }
      //TODO: add function pointer support
    } else if (
      node.type === "PrefixExpression" ||
      node.type === "PostfixExpression"
    ) {
      if (node.operator === "++" || node.operator === "--") {
        // only increment and decrement expressions become statements
        return getArithmeticPrePostfixExpressionNodes(node, symbolTable)
          .storeNodes;
      } else {
        return [];
      }
    } else if (
      node.type === "AddressOfExpression" ||
      node.type === "BinaryExpression" ||
      node.type === "FloatConstant" ||
      node.type === "IntegerConstant" ||
      node.type === "IdentifierExpression" ||
      node.type === "PointerDereference" ||
      node.type === "SizeOfExpression"
    ) {
      // all these expression statements can be safely ignored as they have no side effects
      return [];
    } else if(node.type === "Declaration") {
      return processDeclaration(node, symbolTable, enclosingFunc);
    } else {
      throw new ProcessingError(`Unhandled C AST node: ${toJson(node)}`);
    }
  } catch (e) {
    if (e instanceof ProcessingError) {
      e.addPositionInfo(node.position);
    }
    throw e;
  }
}