/**
 * Defines the vist function for traversing the C AST and translating into WAT-AST.
 */

import {
  PrefixExpression,
  PostfixExpression,
  CompoundAssignment,
} from "~src/c-ast/arithmetic";
import { ArrayInitialization, ArrayDeclaration } from "~src/c-ast/arrays";
import { Assignment } from "~src/c-ast/assignment";
import { ReturnStatement, FunctionCallStatement } from "~src/c-ast/functions";
import { DoWhileLoop, WhileLoop, ForLoop } from "~src/c-ast/loops";
import { CNode, Block } from "~src/c-ast/core";
import { SelectStatement } from "~src/c-ast/select";
import { Initialization, VariableDeclaration } from "~src/c-ast/variable";
import { getVariableSize } from "~src/common/utils";
import evaluateExpression from "~src/translator/evaluateExpression";
import {
  BASE_POINTER,
  WASM_ADDR_SIZE,
  getFunctionCallStackFrameSetupStatements,
  getFunctionStackFrameTeardownStatements,
  getPointerArithmeticNode,
} from "~src/translator/memoryUtil";
import {
  addStatement,
  unaryOperatorToBinaryOperator,
} from "~src/translator/util";
import {
  variableTypeToWasmType,
  convertVarNameToScopedVarName,
  getArrayConstantIndexElementAddr,
  getVariableAddr,
  getMemoryAccessDetails,
} from "~src/translator/variableUtil";
import { WasmSelectStatement } from "~src/wasm-ast/control";
import { WasmModule, WasmStatement } from "~src/wasm-ast/core";
import { WasmFunction } from "~src/wasm-ast/functions";
import {
  MemoryVariableByteSize,
  WasmLocalVariable,
  WasmLocalArray,
  WasmMemoryStore,
} from "~src/wasm-ast/memory";
import { WasmArithmeticExpression } from "~src/wasm-ast/operations";

/**
 * Function for visting the statements within a function body.
 * For now, expressions execpt function calls are ignored since they are inconsequential. TODO: check this
 * @param CAstNode Node being visited.
 * @param enclosingFunc The enclosing function within which we are visiting lines.
 * @param enclosingBody If provided, add the new statement to this enclosing body instead of then enclosing function
 */
export default function visit(
  wasmRoot: WasmModule, // the wasm modul
  CAstNode: CNode,
  enclosingFunc: WasmFunction,
  enclosingBody?: WasmStatement[],
) {
  if (CAstNode.type === "Block") {
    const n = CAstNode as Block;
    enclosingFunc.scopes.push(new Set()); // push on new scope for this block
    n.children.forEach((child) =>
      visit(wasmRoot, child, enclosingFunc, enclosingBody),
    );
    enclosingFunc.scopes.pop(); // pop off the scope for this block
  } else if (CAstNode.type === "ReturnStatement") {
    const n = CAstNode as ReturnStatement;
    // main shouldnt have any return for wasm
    if (enclosingFunc.name !== "main") {
      if (typeof n.value !== "undefined") {
        addStatement(
          {
            type: "MemoryStore",
            addr: getPointerArithmeticNode(BASE_POINTER, "+", WASM_ADDR_SIZE),
            value: evaluateExpression(wasmRoot, n.value, enclosingFunc),
            varType: enclosingFunc.returnVariable.varType,
            numOfBytes: enclosingFunc.returnVariable
              .size as MemoryVariableByteSize, // TODO: change when implement structs
          },
          enclosingFunc,
          enclosingBody,
        );
      }
      addStatement(
        {
          type: "ReturnStatement",
        },
        enclosingFunc,
        enclosingBody,
      );
    }
  } else if (CAstNode.type === "Initialization") {
    const n = CAstNode as Initialization;
    enclosingFunc.scopes[enclosingFunc.scopes.length - 1].add(n.name);
    const variableSize = getVariableSize(n.variableType);
    enclosingFunc.bpOffset += variableSize; // increment bpOffset by size of the variable
    const v: WasmLocalVariable = {
      type: "LocalVariable",
      name: convertVarNameToScopedVarName(
        n.name,
        enclosingFunc.scopes.length - 1,
      ),
      size: variableSize,
      bpOffset: enclosingFunc.bpOffset,
      varType: variableTypeToWasmType[n.variableType],
    };
    enclosingFunc.locals[v.name] = v;
    addStatement(
      {
        type: "MemoryStore",
        addr: getVariableAddr(wasmRoot, v.name, enclosingFunc),
        value: evaluateExpression(wasmRoot, n.value, enclosingFunc),
        varType: variableTypeToWasmType[n.variableType],
        numOfBytes: getVariableSize(n.variableType),
      },
      enclosingFunc,
      enclosingBody,
    );
  } else if (CAstNode.type === "ArrayInitialization") {
    const n = CAstNode as ArrayInitialization;
    enclosingFunc.scopes[enclosingFunc.scopes.length - 1].add(n.name);
    const elementSize = getVariableSize(n.variableType);
    enclosingFunc.bpOffset += n.size * elementSize;
    const array: WasmLocalArray = {
      type: "LocalArray",
      name: convertVarNameToScopedVarName(
        n.name,
        enclosingFunc.scopes.length - 1,
      ),
      size: n.size, // size in number of elements
      bpOffset: enclosingFunc.bpOffset,
      varType: variableTypeToWasmType[n.variableType],
      elementSize,
    };

    enclosingFunc.locals[array.name] = array;

    for (let i = 0; i < n.size; ++i) {
      addStatement(
        {
          type: "MemoryStore",
          addr: getArrayConstantIndexElementAddr(
            wasmRoot,
            n.name,
            i,
            getVariableSize(n.variableType),
            enclosingFunc,
          ),
          value: evaluateExpression(wasmRoot, n.elements[i], enclosingFunc),
          varType: variableTypeToWasmType[n.variableType],
          numOfBytes: getVariableSize(n.variableType),
        },
        enclosingFunc,
        enclosingBody,
      );
    }
  } else if (CAstNode.type === "VariableDeclaration") {
    const n = CAstNode as VariableDeclaration;
    enclosingFunc.scopes[enclosingFunc.scopes.length - 1].add(n.name);
    const variableSize = getVariableSize(n.variableType);
    enclosingFunc.bpOffset += variableSize;
    const localVar: WasmLocalVariable = {
      type: "LocalVariable",
      name: convertVarNameToScopedVarName(
        n.name,
        enclosingFunc.scopes.length - 1,
      ),
      size: variableSize,
      bpOffset: enclosingFunc.bpOffset,
      varType: variableTypeToWasmType[n.variableType],
    };
    enclosingFunc.locals[localVar.name] = localVar;
  } else if (CAstNode.type === "ArrayDeclaration") {
    const n = CAstNode as ArrayDeclaration;
    enclosingFunc.scopes[enclosingFunc.scopes.length - 1].add(n.name);
    const elementSize = getVariableSize(n.variableType);
    enclosingFunc.bpOffset += n.size * elementSize;
    const array: WasmLocalArray = {
      type: "LocalArray",
      name: convertVarNameToScopedVarName(
        n.name,
        enclosingFunc.scopes.length - 1,
      ),
      size: n.size, // size in number of elements
      bpOffset: enclosingFunc.bpOffset,
      varType: variableTypeToWasmType[n.variableType],
      elementSize: elementSize,
    };

    enclosingFunc.locals[array.name] = array;
  } else if (CAstNode.type === "Assignment") {
    const n = CAstNode as Assignment;
    const memoryAccessDetails = getMemoryAccessDetails(
      wasmRoot,
      n.variable,
      enclosingFunc,
    );
    addStatement(
      {
        type: "MemoryStore",
        value: evaluateExpression(wasmRoot, n.value, enclosingFunc),
        ...memoryAccessDetails,
      },
      enclosingFunc,
      enclosingBody,
    );
  } else if (CAstNode.type === "FunctionCallStatement") {
    const n = CAstNode as FunctionCallStatement;
    const functionArgs = [];
    for (const arg of n.args) {
      functionArgs.push(evaluateExpression(wasmRoot, arg, enclosingFunc));
    }
    addStatement(
      {
        type: "FunctionCallStatement",
        name: n.name,
        stackFrameSetup: getFunctionCallStackFrameSetupStatements(
          wasmRoot.functions[n.name],
          functionArgs,
        ),
        stackFrameTearDown: getFunctionStackFrameTeardownStatements(
          wasmRoot.functions[n.name],
          false,
        ),
      },
      enclosingFunc,
      enclosingBody,
    );
  } else if (
    CAstNode.type === "PrefixExpression" ||
    CAstNode.type === "PostfixExpression"
  ) {
    // handle the case where a prefix or postfix expression is used as a statement, not an expression.
    const n = CAstNode as PrefixExpression | PostfixExpression;
    const memoryAccessDetails = getMemoryAccessDetails(
      wasmRoot,
      n.variable,
      enclosingFunc,
    );
    const localMemStore: WasmMemoryStore = {
      type: "MemoryStore",
      value: {
        type: "ArithmeticExpression",
        operator: unaryOperatorToBinaryOperator[n.operator],
        leftExpr: {
          type: "MemoryLoad",
          ...memoryAccessDetails,
        },
        rightExpr: {
          type: "Const",
          variableType: "i32",
          value: 1,
        },
        varType: memoryAccessDetails.varType,
      },
      ...memoryAccessDetails,
    };
    addStatement(localMemStore, enclosingFunc, enclosingBody);
  } else if (CAstNode.type === "CompoundAssignment") {
    const n = CAstNode as CompoundAssignment;
    const memoryAccessDetails = getMemoryAccessDetails(
      wasmRoot,
      n.variable,
      enclosingFunc,
    );
    const arithmeticExpr: WasmArithmeticExpression = {
      type: "ArithmeticExpression",
      operator: n.operator,
      varType: variableTypeToWasmType[n.variable.variableType],
      leftExpr: {
        type: "MemoryLoad",
        ...memoryAccessDetails,
      },
      rightExpr: evaluateExpression(wasmRoot, n.value, enclosingFunc),
    };
    // parameter assignment or assignment to local scope variable
    addStatement(
      {
        type: "MemoryStore",
        value: arithmeticExpr,
        ...memoryAccessDetails,
      },
      enclosingFunc,
      enclosingBody,
    );
  } else if (CAstNode.type === "SelectStatement") {
    const n = CAstNode as SelectStatement;
    const actions: WasmStatement[] = [];
    visit(wasmRoot, n.ifBlock.block, enclosingFunc, actions); // visit all the actions inside the if block
    const rootNode: WasmSelectStatement = {
      type: "SelectStatement",
      condition: evaluateExpression(
        wasmRoot,
        n.ifBlock.condition,
        enclosingFunc,
      ),
      actions,
      elseStatements: [],
    };
    let currNode = rootNode;
    for (const elseIfBlock of n.elseIfBlocks) {
      const actions: WasmStatement[] = [];
      visit(wasmRoot, elseIfBlock.block, enclosingFunc, actions);
      const elseIfNode: WasmSelectStatement = {
        type: "SelectStatement",
        condition: evaluateExpression(
          wasmRoot,
          elseIfBlock.condition,
          enclosingFunc,
        ),
        actions,
        elseStatements: [],
      };
      currNode.elseStatements = [elseIfNode];
      currNode = elseIfNode;
    }
    if (n.elseBlock) {
      const elseActions: WasmStatement[] = [];
      visit(wasmRoot, n.elseBlock, enclosingFunc, elseActions);
      currNode.elseStatements = elseActions;
    }
    addStatement(rootNode, enclosingFunc, enclosingBody);
  } else if (CAstNode.type === "DoWhileLoop") {
    const n = CAstNode as DoWhileLoop;
    const loopLabel = `loop_${(enclosingFunc.loopCount++).toString()}`;
    const body: WasmStatement[] = [];
    visit(wasmRoot, n.body, enclosingFunc, body); // visit all the statements in the body of the do while loop
    // add the branching statement at end of loop body
    body.push({
      type: "BranchIf",
      label: loopLabel,
      condition: evaluateExpression(wasmRoot, n.condition, enclosingFunc),
    });
    addStatement(
      {
        type: "Loop",
        label: loopLabel,
        body,
      },
      enclosingFunc,
      enclosingBody,
    );
  } else if (CAstNode.type === "WhileLoop") {
    const n = CAstNode as WhileLoop;
    const blockLabel = `block_${(enclosingFunc.blockCount++).toString()}`;
    const loopLabel = `loop_${(enclosingFunc.loopCount++).toString()}`;
    const body: WasmStatement[] = [];
    // add the branch if statement to start of loop body
    body.push({
      type: "BranchIf",
      label: blockLabel,
      condition: {
        type: "BooleanExpression",
        isNegated: true,
        expr: evaluateExpression(wasmRoot, n.condition, enclosingFunc),
      },
    });
    visit(wasmRoot, n.body, enclosingFunc, body); // visit all the statements in the body of the while loop
    // add the branching statement at end of loop body
    body.push({
      type: "Branch",
      label: loopLabel,
    });
    addStatement(
      {
        type: "Block",
        label: blockLabel,
        body: [
          {
            type: "Loop",
            label: loopLabel,
            body,
          },
        ],
      },
      enclosingFunc,
      enclosingBody,
    );
  } else if (CAstNode.type === "ForLoop") {
    const n = CAstNode as ForLoop;
    const blockLabel = `block_${(enclosingFunc.blockCount++).toString()}`;
    const loopLabel = `loop_${(enclosingFunc.loopCount++).toString()}`;
    enclosingFunc.scopes.push(new Set()); // push on new scope for this for loop initialization
    visit(wasmRoot, n.initialization, enclosingFunc, enclosingBody); // add init statement for for loop
    const body: WasmStatement[] = [];
    // add the branch if statement to start of loop body
    body.push({
      type: "BranchIf",
      label: blockLabel,
      condition: {
        type: "BooleanExpression",
        isNegated: true,
        expr: evaluateExpression(wasmRoot, n.condition, enclosingFunc),
      },
    });
    visit(wasmRoot, n.body, enclosingFunc, body); // visit all the statements in the body of the for loop
    // add the for loop update expression
    visit(wasmRoot, n.update, enclosingFunc, body);
    // add the branching statement at end of loop body
    body.push({
      type: "Branch",
      label: loopLabel,
    });
    enclosingFunc.scopes.pop(); // pop off the scope for this for loop
    addStatement(
      {
        type: "Block",
        label: blockLabel,
        body: [
          {
            type: "Loop",
            label: loopLabel,
            body,
          },
        ],
      },
      enclosingFunc,
      enclosingBody,
    );
  } else {
    console.assert(false, "Translator error: Unhandled AST node");
  }
}
