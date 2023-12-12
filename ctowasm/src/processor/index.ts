/**
 * Exports a "process" function that can be used to process the AST generated by the parser.
 * Processing involves:
 * 1. Adding scope to each node of the AST. (to serve as an in-built symbol table with lexcial scoping)
 */

import { getVariableSize } from "~src/common/utils";
import { ProcessingError } from "../errors";
import { CAstRoot } from "~src/c-ast/root";
import {
  ArithmeticExpression,
  CompoundAssignmentExpression,
} from "~src/c-ast/arithmetic";
import {
  ArrayDeclaration,
  ArrayInitialization,
  ArrayElementExpr,
} from "~src/c-ast/arrays";
import { Assignment, AssignmentExpression } from "~src/c-ast/assignment";
import {
  ConditionalExpression,
  ComparisonExpression,
  ComparisonSubExpression,
} from "~src/c-ast/boolean";
import {
  FunctionDefinition,
  FunctionDeclaration,
  FunctionCall,
  FunctionCallStatement,
  ReturnStatement,
} from "~src/c-ast/functions";
import { Integer } from "~src/c-ast/literals";
import { DoWhileLoop, WhileLoop, ForLoop } from "~src/c-ast/loops";
import {
  Initialization,
  VariableDeclaration,
  VariableExpr,
} from "~src/c-ast/variable";
import { SelectStatement, ConditionalBlock } from "~src/c-ast/select";
import {
  checkForRedeclaration,
  checkForFunctionDeclaration,
  checkForVariableDeclaration,
  checkForArrayDeclaration,
  checkForFunctionParameterRedeclaration,
} from "~src/semanticAnalyser/checks";
import { evaluateConstantArithmeticExpression } from "~src/processor/util";

/**
 * Processes the C AST tree generated by parsing, to add additional needed information for certain nodes.
 * @param ast
 * @param sourceCode
 * @returns
 */
export default function process(sourceCode: string, ast: CAstRoot) {
  visit(sourceCode, ast);
  return ast;
}

/**
 * Visitor function for traversing the C AST to process C AST. 
 * Will call visit on all the fields of the current node being traversed.
 * @param ast
 * @param sourceCode
 */
function visit(
  sourceCode: string,
  node: any,
  enclosingFunc?: FunctionDefinition
) {
  if (!(Array.isArray(node) || (typeof node === 'object' && node !== null && "type" in node))) {
    // ignore objects that are not AST nodes OR not an array of nodes
    return;
  }

  // special handling for function definition, so we dont visit parameters
  if (node.type === "FunctionDefinition") {
    const n = node as FunctionDefinition;
    // set the fields for tracking sizes as 0 - they will be incremented as more nodes are visited.
    n.sizeOfLocals = 0;
    // size of parameters can be calculated immediately
    n.sizeOfParameters = n.parameters.reduce(
      (sum, curr) => sum + getVariableSize(curr.variableType),
      0
    );
    n.sizeOfReturn = n.returnType ? getVariableSize(n.returnType) : 0;

    // update the enclosing function to store reference to this function
    visit(sourceCode, n.body, node);
    return;
  }

  // Special actions for specific node types
  if (node.type === "VariableDeclaration") {
    const n = node as VariableDeclaration;
    if (enclosingFunc) {
      enclosingFunc.sizeOfLocals += getVariableSize(n.variableType);
    }
  } else if (node.type === "ArrayDeclaration") {
    const n = node as ArrayDeclaration;
    if (enclosingFunc) {
      enclosingFunc.sizeOfLocals += getVariableSize(n.variableType) * n.size;
    }
  } else if (node.type === "Initialization") {
    const n = node as Initialization;
    if (enclosingFunc) {
      enclosingFunc.sizeOfLocals += getVariableSize(n.variableType);
    } else {
      // this intialization is global. Needs to be a constant expression, which we can evaluate now
      if (n.value.type === "ArithmeticExpression") {
        n.value = evaluateConstantArithmeticExpression(
          sourceCode,
          n.value as ArithmeticExpression
        );
      }
    }
  } else if (node.type === "ArrayInitialization") {
    const n = node as ArrayInitialization;
    if (enclosingFunc) {
      enclosingFunc.sizeOfLocals += getVariableSize(n.variableType) * n.size;
      n.elements.forEach((e) => visit(sourceCode, e, enclosingFunc));
    } else {
      // this intialization is global. Needs to be a constant expression (assumed), which we can evaluate now
      const evaluatedElements = [];
      for (const element of n.elements) {
        if (element.type === "ArithmeticExpression") {
          evaluatedElements.push(
            evaluateConstantArithmeticExpression(
              sourceCode,
              element as ArithmeticExpression
            )
          );
        } else if (element.type === "Integer") {
          // element is already an integer
          evaluatedElements.push(element);
        } else {
          throw new ProcessingError(
            "Intializer element of global variable is not constant",
            sourceCode,
            node.position
          );
        }
      }
      n.elements = evaluatedElements;
    }
  } 

  // visit each child of this node
  for (const k of Object.keys(node)) {
    visit(sourceCode, node[k], enclosingFunc);
  }
}
