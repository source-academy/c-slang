/**
 * Defines the vist function for traversing the C AST and translating into WAT-AST.
 */

import {
  PrefixExpression,
  PostfixExpression,
} from "~src/c-ast/unaryExpression";
import { ArrayInitialization } from "~src/c-ast/arrays";
import { Assignment } from "~src/c-ast/assignment";
import { ReturnStatement, FunctionDefinition } from "~src/c-ast/functions";
import { DoWhileLoop, WhileLoop, ForLoop } from "~src/c-ast/loops";
import { Block, BlockItem, isExpression } from "~src/c-ast/core";
import { SelectStatement } from "~src/c-ast/select";
import { Initialization } from "~src/c-ast/variable";
import { getVariableSize } from "~src/common/utils";
import translateExpression from "~src/translator/translateExpression";
import {
  BASE_POINTER,
  WASM_ADDR_SIZE,
  WASM_ADDR_TYPE,
  getPointerArithmeticNode,
} from "~src/translator/memoryUtil";
import {
  addToSymbolTable,
  createSymbolTable,
  getUniqueBlockLabelGenerator,
  getUniqueLoopLabelGenerator,
  unaryOperatorToInstruction,
  wasmTypeToSize,
} from "~src/translator/util";
import {
  variableTypeToWasmType,
  getArrayConstantIndexElementAddr,
  getVariableAddr,
  getMemoryAccessDetails,
  getTypeConversionWrapper,
} from "~src/translator/variableUtil";
import { WasmSelectStatement } from "~src/wasm-ast/control";
import { WasmModule, WasmStatement } from "~src/wasm-ast/core";
import {
  WasmSymbolTable,
  WasmFunction,
  WasmFunctionCallStatement,
  WasmRegularFunctionCallStatement,
} from "~src/wasm-ast/functions";
import {
  WasmLocalVariable,
  WasmLocalArray,
  WasmMemoryLoad,
} from "~src/wasm-ast/memory";
import { TranslationError } from "~src/errors";
import { WasmBinaryExpression } from "~src/wasm-ast/binaryExpression";
import { WasmBooleanExpression } from "~src/wasm-ast/misc";
import translateFunctionCall from "~src/translator/translateFunctionCall";
import { WasmIntegerConst } from "~src/wasm-ast/consts";

/**
 * Function for trnslating a C function to a wasm function.
 * For now, expressions execpt function calls are ignored since they are inconsequential. TODO: check this
 * @param wasmRoot the wasm module itself.
 * @param Cfunction the function being translated.
 * @param rootSymbolTable the starting symbol table. contains globals.
 */
export default function translateFunction(
  wasmRoot: WasmModule,
  Cfunction: FunctionDefinition,
  rootSymbolTable: WasmSymbolTable
) {
  const symbolTable = createSymbolTable(rootSymbolTable, true); // reset the offset counter to start symbol table offset fresh for each new function

  // evaluate all parameters first
  const params: WasmLocalVariable[] = [];
  Cfunction.parameters.forEach((param) => {
    const variableSize = getVariableSize(param.variableType);
    const localVar: WasmLocalVariable = {
      type: "LocalVariable",
      name: param.name,
      size: variableSize,
      offset: symbolTable.currOffset.value + variableSize,
      cVarType: param.variableType,
      wasmVarType: variableTypeToWasmType[param.variableType],
    };
    params.push(localVar);
    addToSymbolTable(symbolTable, localVar);
  });

  const enclosingFunc: WasmFunction = {
    type: "Function",
    name: Cfunction.name,
    params,
    sizeOfLocals: Cfunction.sizeOfLocals,
    sizeOfParams: Cfunction.sizeOfParameters,
    returnVariable:
      Cfunction.returnType !== null
        ? {
            type: "ReturnVariable",
            name: `${Cfunction.name}_return`,
            size: Cfunction.sizeOfReturn,
            varType: variableTypeToWasmType[Cfunction.returnType],
          }
        : null,
    body: [],
  };

  wasmRoot.functions[Cfunction.name] = enclosingFunc;

  const generateLoopLabel = getUniqueLoopLabelGenerator();
  const generateBlockLabel = getUniqueBlockLabelGenerator();

  /**
   * Visitor function for visting nodes and translating them to statements to add to enclosingBody.
   * @param symbolTable current symbol table.
   * @param node node being visited.
   * @param statementBody the array to add the translated statement to.
   */
  function visit(
    symbolTable: WasmSymbolTable,
    node: BlockItem,
    statementBody: WasmStatement[]
  ) {
    if (node.type === "Block") {
      const n = node as Block;
      const newSymbolTable = createSymbolTable(symbolTable);
      n.children.forEach((child) =>
        visit(newSymbolTable, child, statementBody)
      );
    } else if (node.type === "ReturnStatement") {
      const n = node as ReturnStatement;
      if (typeof n.value !== "undefined") {
        statementBody.push({
          type: "MemoryStore",
          addr: getPointerArithmeticNode(BASE_POINTER, "+", WASM_ADDR_SIZE),
          value: translateExpression(wasmRoot, symbolTable, n.value),
          wasmVariableType: enclosingFunc.returnVariable.varType,
          numOfBytes: wasmTypeToSize[enclosingFunc.returnVariable.varType], // TODO: change when implement structs
        });
      }
      statementBody.push({
        type: "ReturnStatement",
      });
    } else if (
      node.type === "Initialization" ||
      node.type === "VariableDeclaration"
    ) {
      const n = node as Initialization;
      const variableSize = getVariableSize(n.variableType);
      const v: WasmLocalVariable = {
        type: "LocalVariable",
        name: n.name,
        size: variableSize,
        offset: symbolTable.currOffset.value + variableSize, // stack grows from high to low; so start of varaible address needs to account for variable size
        cVarType: n.variableType,
        wasmVarType: variableTypeToWasmType[n.variableType],
      };
      addToSymbolTable(symbolTable, v);

      if (node.type === "Initialization") {
        statementBody.push({
          type: "MemoryStore",
          addr: getVariableAddr(symbolTable, v.name),
          value: getTypeConversionWrapper(
            node.value.variableType,
            n.variableType,
            translateExpression(wasmRoot, symbolTable, node.value)
          ),
          wasmVariableType: variableTypeToWasmType[n.variableType],
          numOfBytes: getVariableSize(n.variableType),
        });
      }
    } else if (
      node.type === "ArrayInitialization" ||
      node.type === "ArrayDeclaration"
    ) {
      const n = node as ArrayInitialization;
      const elementSize = getVariableSize(n.variableType);
      const array: WasmLocalArray = {
        type: "LocalArray",
        arraySize: n.numElements,
        name: n.name,
        size: n.numElements * elementSize,
        offset: symbolTable.currOffset.value + n.numElements * elementSize,
        cVarType: n.variableType,
        wasmVarType: variableTypeToWasmType[n.variableType],
        elementSize,
      };
      addToSymbolTable(symbolTable, array);

      if (node.type === "ArrayInitialization") {
        for (let i = 0; i < n.numElements; ++i) {
          statementBody.push({
            type: "MemoryStore",
            addr: getArrayConstantIndexElementAddr(
              symbolTable,
              n.name,
              i,
              getVariableSize(n.variableType)
            ),
            value: getTypeConversionWrapper(
              n.elements[i].variableType,
              n.variableType,
              translateExpression(wasmRoot, symbolTable, n.elements[i])
            ),
            wasmVariableType: variableTypeToWasmType[n.variableType],
            numOfBytes: getVariableSize(n.variableType),
          });
        }
      }
    } else if (node.type === "Assignment") {
      const n = node as Assignment;
      const memoryAccessDetails = getMemoryAccessDetails(
        wasmRoot,
        symbolTable,
        n.variable
      );
      statementBody.push({
        type: "MemoryStore",
        wasmVariableType: variableTypeToWasmType[n.variable.variableType],
        value: getTypeConversionWrapper(
          n.value.variableType,
          n.variable.variableType,
          translateExpression(wasmRoot, symbolTable, n.value)
        ),
        ...memoryAccessDetails,
      });
    } else if (node.type === "FunctionCallStatement") {
      statementBody.push(
        translateFunctionCall(wasmRoot, symbolTable, node) as
          | WasmFunctionCallStatement
          | WasmRegularFunctionCallStatement
      );
    } else if (
      node.type === "PrefixExpression" ||
      node.type === "PostfixExpression"
    ) {
      // handle the case where a prefix or postfix expression is used as a statement, not an expression.
      const n = node as PrefixExpression | PostfixExpression;
      const memoryAccessDetails = getMemoryAccessDetails(
        wasmRoot,
        symbolTable,
        n.variable
      );
      statementBody.push({
        type: "MemoryStore",
        wasmVariableType: memoryAccessDetails.wasmVariableType,
        value: {
          type: "BinaryExpression",
          instruction: unaryOperatorToInstruction(
            n.operator,
            n.variable.variableType
          ),
          wasmVariableType: memoryAccessDetails.wasmVariableType,
          leftExpr: {
            type: "MemoryLoad",
            wasmVariableType: memoryAccessDetails.wasmVariableType,
            ...memoryAccessDetails,
          } as WasmMemoryLoad,
          rightExpr: {
            type: "IntegerConst",
            wasmVariableType: WASM_ADDR_TYPE,
            value: 1n,
          } as WasmIntegerConst,
        } as WasmBinaryExpression,
        ...memoryAccessDetails,
      });
    } else if (node.type === "SelectStatement") {
      const n = node as SelectStatement;
      const actions: WasmStatement[] = [];
      visit(symbolTable, n.ifBlock.block, actions); // visit all the actions inside the if block
      const rootSelectNode: WasmSelectStatement = {
        type: "SelectStatement",
        condition: translateExpression(
          wasmRoot,
          symbolTable,
          n.ifBlock.condition
        ),
        actions,
        elseStatements: [],
      };
      let currNode = rootSelectNode;
      for (const elseIfBlock of n.elseIfBlocks) {
        const actions: WasmStatement[] = [];
        visit(symbolTable, elseIfBlock.block, actions);
        const elseIfNode: WasmSelectStatement = {
          type: "SelectStatement",
          condition: translateExpression(
            wasmRoot,
            symbolTable,
            elseIfBlock.condition
          ),
          actions,
          elseStatements: [],
        };
        currNode.elseStatements = [elseIfNode];
        currNode = elseIfNode;
      }
      if (n.elseBlock) {
        const elseActions: WasmStatement[] = [];
        visit(symbolTable, n.elseBlock, elseActions);
        currNode.elseStatements = elseActions;
      }
      statementBody.push(rootSelectNode);
    } else if (node.type === "DoWhileLoop") {
      const n = node as DoWhileLoop;
      const loopLabel = generateLoopLabel();
      const body: WasmStatement[] = [];
      visit(symbolTable, n.body, body); // visit all the statements in the body of the do while loop
      // add the branching statement at end of loop body
      body.push({
        type: "BranchIf",
        label: loopLabel,
        condition: translateExpression(wasmRoot, symbolTable, n.condition),
      });
      statementBody.push({
        type: "Loop",
        label: loopLabel,
        body,
      });
    } else if (node.type === "WhileLoop") {
      const n = node as WhileLoop;
      const blockLabel = generateBlockLabel();
      const loopLabel = generateLoopLabel();
      const body: WasmStatement[] = [];
      // add the branch if statement to start of loop body
      body.push({
        type: "BranchIf",
        label: blockLabel,
        condition: {
          type: "BooleanExpression",
          isNegated: true,
          expr: translateExpression(wasmRoot, symbolTable, n.condition),
        } as WasmBooleanExpression,
      });
      visit(symbolTable, n.body, body); // visit all the statements in the body of the while loop
      // add the branching statement at end of loop body
      body.push({
        type: "Branch",
        label: loopLabel,
      });
      statementBody.push({
        type: "Block",
        label: blockLabel,
        body: [
          {
            type: "Loop",
            label: loopLabel,
            body,
          },
        ],
      });
    } else if (node.type === "ForLoop") {
      const n = node as ForLoop;
      const blockLabel = generateBlockLabel();
      const loopLabel = generateLoopLabel();
      const conditionSymbolTable = createSymbolTable(symbolTable); // symbol table for condition part of for loop
      visit(conditionSymbolTable, n.initialization, statementBody); // add init statement for for loop
      const body: WasmStatement[] = [];
      // add the branch if statement to start of loop body
      body.push({
        type: "BranchIf",
        label: blockLabel,
        condition: {
          type: "BooleanExpression",
          isNegated: true,
          expr: translateExpression(
            wasmRoot,
            conditionSymbolTable,
            n.condition
          ),
        } as WasmBooleanExpression,
      });
      visit(conditionSymbolTable, n.body, body); // visit all the statements in the body of the for loop
      const bodySymbolTable = createSymbolTable(conditionSymbolTable); // symbol table for body of for loop
      // add the for loop update expression
      visit(bodySymbolTable, n.update, body);
      // add the branching statement at end of loop body
      body.push({
        type: "Branch",
        label: loopLabel,
      });
      statementBody.push({
        type: "Block",
        label: blockLabel,
        body: [
          {
            type: "Loop",
            label: loopLabel,
            body,
          },
        ],
      });
    } else if (isExpression(node)) {
      // explictly ignore expressions as they do not affect final code at runtime
    } else {
      throw new TranslationError(`Unhandled AST node: ${node}`);
    }
  }

  Cfunction.body.children.forEach((node) => {
    visit(symbolTable, node, enclosingFunc.body);
  });
}
