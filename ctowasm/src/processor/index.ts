/**
 * C AST Processor Module.
 */

import { CAstRoot } from "~src/parser/c-ast/core";
import { CAstRootP } from "~src/processor/c-ast/core";
import processFunctionDefinition from "~src/processor/functionUtil";
import processDeclaration from "~src/processor/processDeclaration";
import processStatement from "~src/processor/processStatement";
import { SymbolTable } from "~src/processor/symbolTable";


/**
 * Processes the C AST tree generated by parsing, to add additional needed information for certain nodes.
 * @param ast
 * @param sourceCode
 * @returns
 */
export default function process(ast: CAstRoot) {
  const symbolTable = new SymbolTable();
  const processedAst: CAstRootP = {
    type: "Root",
    functions: [],
    statements: [],
  };
  ast.children.forEach((child) => {
    // special handling for function definitions
    if (child.type === "FunctionDefinition") {
      processedAst.functions.push(
        processFunctionDefinition(child, symbolTable)
      );
    } else {
      const processedNode = processDeclaration(child, symbolTable) 
      if (processedNode === null) {
        return;
      } else if (Array.isArray(processedNode)) {
        processedNode.forEach((statement) =>
          processedAst.statements.push(statement)
        );
      } else {
        processedAst.statements.push(processedNode);
      }
    }
  });
  return processedAst;
}
