/**
 * Exports a translate function that takes a C AST and produces a webassembly AST
 */

import {
  Root,
  Node,
  FunctionDefinition,
  VariableType,
  VariableDeclaration,
  Initialization,
  Literal,
  Block,
  ReturnStatement,
  VariableExpr,
  Expression,
  FunctionCall,
  Assignment,
  ArithmeticExpression,
  PrefixExpression,
  PostfixExpression,
  FunctionCallStatement,
  ConditionalExpression,
  CompoundAssignment,
  BinaryOperator,
  ComparisonExpression,
  SelectStatement,
  AssignmentExpression,
  CompoundAssignmentExpression,
  DoWhileLoop,
  WhileLoop,
  ForLoop,
  Integer,
} from "c-ast/c-nodes";
import {
  variableSizes,
  WASM_PAGE_SIZE,
  BASE_POINTER,
  PARAM_PREFIX,
  WASM_ADDR_SIZE,
  STACK_POINTER,
  HEAP_POINTER,
  REG_1,
  REG_2,
} from "constant";

import {
  WasmArithmeticExpression,
  WasmConst,
  WasmExpression,
  WasmFunction,
  WasmDataSegmentVariable,
  WasmLocalVariable,
  WasmMemoryLoad,
  WasmMemoryStore,
  WasmModule,
  WasmSelectStatement,
  WasmStatement,
  WasmType,
  WasmFunctionParameter,
} from "wasm-ast/wasm-nodes";

export function translate(CAstRoot: Root, testMode?: boolean) {
  const wasmRoot: WasmModule = {
    type: "Module",
    globals: {}, // global variables that are stored in memory
    globalWasmVariables: [], // actual wasm globals
    functions: {},
    memorySize: 1,
  };

  let currMemoryOffset = 0;

  /**
   * Returns memory address for a global variable.
   * Increases memory size if needed.
   */
  function getGlobalMemoryAddr(variableType: VariableType) {
    const offset = currMemoryOffset;
    currMemoryOffset += variableSizes[variableType];
    if (currMemoryOffset >= wasmRoot.memorySize * WASM_PAGE_SIZE) {
      // not enough pages, incr pages by 1
      ++wasmRoot.memorySize;
    }
    return offset;
  }

  /**
   * Returns the address to use for memory instructions for a variable,
   * depending on whether it is a local or global variable.
   */
  function getVariableAddr(
    variableName: string,
    enclosingFunc: WasmFunction
  ): WasmExpression {
    const wasmVariableName = getWasmVariableName(variableName, enclosingFunc);
    if (
      wasmVariableName in enclosingFunc.params ||
      wasmVariableName in enclosingFunc.locals
    ) {
      // local variable
      let variable: WasmLocalVariable;
      if (wasmVariableName in enclosingFunc.params) {
        variable = enclosingFunc.params[wasmVariableName];
      } else {
        variable = enclosingFunc.locals[wasmVariableName];
      }
      return {
        type: "ArithmeticExpression",
        operator: "-",
        leftExpr: {
          type: "GlobalGet",
          name: BASE_POINTER,
        },
        rightExpr: {
          type: "Const",
          variableType: "i32",
          value: variable.bpOffset,
        },
        varType: "i32",
      };
    } else {
      // global variable
      const variable = wasmRoot.globals[wasmVariableName];
      return {
        type: "Const",
        variableType: "i32",
        value: variable.memoryAddr,
      };
    }
  }

  /**
   * Converts a given variable name to a scoped variable name (meaning that scope information is included in the name itself).
   * This is to make up for wasm not having block scope. Thus we can have multiple vars of the same name (in C) in the same function
   * as long as they are in different blocks since their names in wat will be different.
   */
  function convertVarNameToScopedVarName(name: string, block: number) {
    return `${name}_${block.toString()}`;
  }

  /**
   * Returns the given function parameter name prefixed with "param_".
   */
  function generateParamName(name: string) {
    return PARAM_PREFIX + name;
  }

  const variableTypeToWasmType: Record<VariableType, WasmType> = {
    int: "i32",
    char: "i32",
  };

  /**
   * Converts a given Literal to a WasmConst
   */
  function convertLiteralToConst(literal: Literal): WasmConst {
    let type: WasmType;
    if (literal.type === "Integer") {
      type = "i32";
    }
    return {
      type: "Const",
      variableType: type,
      value: literal.value,
    };
  }

  /**
   * Function that finds out in which scope a variable that is being assigned to or used in an expression belongs in,
   * and generates the name of that variable accordingly.
   */
  function getWasmVariableName(
    originalVariableName: string,
    enclosingFunc: WasmFunction
  ) {
    for (let i = enclosingFunc.scopes.length - 1; i >= 0; --i) {
      if (enclosingFunc.scopes[i].has(originalVariableName)) {
        return convertVarNameToScopedVarName(originalVariableName, i);
      }
    }
    // check if variable is function parameter
    if (generateParamName(originalVariableName) in enclosingFunc.params) {
      return generateParamName(originalVariableName);
    }

    // if reach this point, variable must be a global variable
    return originalVariableName;
  }

  /**
   * Returns the wasm nodes responsible for the pre function call setup.
   */
  function getFunctionCallStackFrameSetupStatements(
    fn: FunctionCall | FunctionCallStatement,
    enclosingFunc: WasmFunction
  ): WasmStatement[] {
    const f = wasmRoot.functions[fn.name];

    // evaluate all the arguments for function call
    const args: WasmExpression[] = fn.args.map((arg) =>
      evaluateExpression(arg, enclosingFunc)
    );

    const statements: WasmStatement[] = [];

    // check that there is sufficient space for memory expansion
    const totalStackSpaceRequired =
      WASM_ADDR_SIZE + f.sizeOfLocals + f.sizeOfParams;
    statements.push({
      type: "SelectStatement",
      condition: {
        type: "ComparisonExpression",
        operator: "<=",
        leftExpr: {
          type: "ArithmeticExpression",
          operator: "-",
          leftExpr: {
            type: "GlobalGet",
            name: STACK_POINTER,
          },
          rightExpr: {
            type: "Const",
            variableType: "i32",
            value: totalStackSpaceRequired,
          },
          varType: "i32",
        },
        rightExpr: {
          type: "GlobalGet",
          name: HEAP_POINTER,
        },
      },
      actions: [
        // expand the memory since not enough space
        // save the last address of stack in REG_1
        {
          type: "GlobalSet",
          name: REG_1,
          value: {
            type: "ArithmeticExpression",
            operator: "*",
            leftExpr: {
              type: "MemorySize",
            },
            rightExpr: {
              type: "Const",
              variableType: "i32",
              value: WASM_PAGE_SIZE,
            },
            varType: "i32",
          },
        },
        // save address of last item in memory to REG_2
        {
          type: "GlobalSet",
          name: REG_2,
          value: {
            type: "ArithmeticExpression",
            operator: "-",
            leftExpr: {
              type: "GlobalGet",
              name: REG_1,
            },
            rightExpr: {
              type: "Const",
              value: 1,
              variableType: "i32",
            },
            varType: "i32",
          },
        },
        // save the size of stack in REG_1
        {
          type: "GlobalSet",
          name: REG_1,
          value: {
            type: "ArithmeticExpression",
            operator: "-",
            leftExpr: {
              type: "GlobalGet",
              name: REG_1,
            },
            rightExpr: {
              type: "GlobalGet",
              name: STACK_POINTER,
            },
            varType: "i32",
          },
        },
        // expand the memory since not enough space
        {
          type: "MemoryGrow",
          pagesToGrowBy: {
            type: "Const",
            variableType: "i32",
            value: Math.ceil(totalStackSpaceRequired / WASM_PAGE_SIZE),
          },
        },
        // set stack pointer to target stack pointer adddress
        {
          type: "GlobalSet",
          name: STACK_POINTER,
          value: {
            type: "ArithmeticExpression",
            operator: "-",
            leftExpr: {
              type: "ArithmeticExpression",
              operator: "*",
              leftExpr: {
                type: "MemorySize",
              },
              rightExpr: {
                type: "Const",
                variableType: "i32",
                value: WASM_PAGE_SIZE,
              },
              varType: "i32",
            },
            rightExpr: {
              type: "GlobalGet",
              name: REG_1,
            },
            varType: "i32",
          },
        },
        // set REG_1 to the last address of new memory
        {
          type: "GlobalSet",
          name: REG_1,
          value: {
            type: "ArithmeticExpression",
            operator: "-",
            leftExpr: {
              type: "ArithmeticExpression",
              operator: "*",
              leftExpr: {
                type: "MemorySize",
              },
              rightExpr: {
                type: "Const",
                variableType: "i32",
                value: WASM_PAGE_SIZE,
              },
              varType: "i32",
            },
            rightExpr: {
              type: "Const",
              value: 1,
              variableType: "i32",
            },
            varType: "i32",
          },
        },
        // copy the stack memory to the end, get REG_1 to below stack pointer
        {
          type: "Block",
          label: "memcopy_block",
          body: [
            {
              type: "Loop",
              label: "memcopy_loop",
              body: [
                {
                  type: "BranchIf",
                  label: "memcopy_block",
                  condition: {
                    type: "BooleanExpression",
                    expr: {
                      type: "ComparisonExpression",
                      operator: "<",
                      leftExpr: {
                        type: "GlobalGet",
                        name: REG_1,
                      },
                      rightExpr: {
                        type: "GlobalGet",
                        name: STACK_POINTER,
                      },
                    },
                  },
                },
                // load item addressed by REG_2 to addr of REG_1
                {
                  type: "MemoryStore",
                  addr: {
                    type: "GlobalGet",
                    name: REG_1,
                  },
                  value: {
                    type: "MemoryLoad",
                    addr: {
                      type: "GlobalGet",
                      name: REG_2,
                    },
                    varType: "i32",
                    numOfBytes: WASM_ADDR_SIZE,
                  },
                  varType: "i32",
                  numOfBytes: WASM_ADDR_SIZE,
                },
                // decrement REG_1
                {
                  type: "GlobalSet",
                  name: REG_1,
                  value: {
                    type: "ArithmeticExpression",
                    operator: "-",
                    leftExpr: {
                      type: "GlobalGet",
                      name: REG_1,
                    },
                    rightExpr: {
                      type: "Const",
                      value: 1,
                      variableType: "i32",
                    },
                    varType: "i32",
                  },
                },
                // decrement REG_2
                {
                  type: "GlobalSet",
                  name: REG_2,
                  value: {
                    type: "ArithmeticExpression",
                    operator: "-",
                    leftExpr: {
                      type: "GlobalGet",
                      name: REG_2,
                    },
                    rightExpr: {
                      type: "Const",
                      value: 1,
                      variableType: "i32",
                    },
                    varType: "i32",
                  },
                },
                {
                  type: "Branch",
                  label: "memcopy_loop",
                },
              ],
            },
          ],
        },
      ],
      elseStatements: [],
    });

    // push BP onto stack
    statements.push({
      type: "MemoryStore",
      addr: {
        type: "GlobalGet",
        name: STACK_POINTER,
        preStatements: [
          {
            type: "GlobalSet",
            name: STACK_POINTER,
            value: {
              type: "ArithmeticExpression",
              varType: "i32",
              operator: "-",
              leftExpr: {
                type: "GlobalGet",
                name: STACK_POINTER,
              },
              rightExpr: {
                type: "Const",
                variableType: "i32",
                value: WASM_ADDR_SIZE,
              },
            },
          },
        ],
      },
      value: {
        type: "GlobalGet",
        name: BASE_POINTER,
      },
      varType: "i32",
      numOfBytes: WASM_ADDR_SIZE,
    });

    // set BP to be SP
    statements.push({
      type: "GlobalSet",
      name: BASE_POINTER,
      value: {
        type: "GlobalGet",
        name: STACK_POINTER,
      },
    });

    // allocate space for params and locals
    statements.push({
      type: "GlobalSet",
      name: STACK_POINTER,
      value: {
        type: "ArithmeticExpression",
        operator: "-",
        varType: "i32",
        leftExpr: {
          type: "GlobalGet",
          name: STACK_POINTER,
        },
        rightExpr: {
          type: "Const",
          variableType: "i32",
          value: f.sizeOfLocals + f.sizeOfParams,
        },
      },
    });

    // set the values of all params
    for (const paramName of Object.keys(f.params)) {
      const param = f.params[paramName];
      statements.push({
        type: "MemoryStore",
        addr: {
          type: "ArithmeticExpression",
          operator: "-",
          varType: "i32",
          leftExpr: {
            type: "GlobalGet",
            name: STACK_POINTER,
          },
          rightExpr: {
            type: "Const",
            variableType: "i32",
            value: param.bpOffset,
          },
        },
        value: args[param.paramIndex],
        varType: "i32",
        numOfBytes: WASM_ADDR_SIZE,
      });
    }

    return statements;
  }

  /**
   * Converts a given unary opeartor into the corresponding asm instruction node name.
   * TODO: add other type support
   */
  const unaryOperatorToBinaryOperator: Record<string, BinaryOperator> = {
    "++": "+",
    "--": "-",
  };

  function addStatement(
    n: WasmStatement,
    enclosingFunc: WasmFunction,
    enclosingBody?: WasmStatement[]
  ) {
    if (typeof enclosingBody !== "undefined") {
      enclosingBody.push(n);
    } else {
      enclosingFunc.body.push(n);
    }
  }

  /**
   * Function for visting the statements within a function body.
   * For now, expressions execpt function calls are ignored since they are inconsequential. TODO: check this
   * @param CAstNode Node being visited.
   * @param enclosingFunc The enclosing function within which we are visiting lines.
   * @param enclosingBody If provided, add the new statement to this enclosing body instead of then enclosing function
   */
  function visit(
    CAstNode: Node,
    enclosingFunc: WasmFunction,
    enclosingBody?: WasmStatement[]
  ) {
    if (CAstNode.type === "Block") {
      const n = CAstNode as Block;
      enclosingFunc.scopes.push(new Set()); // push on new scope for this block
      n.children.forEach((child) => visit(child, enclosingFunc, enclosingBody));
      enclosingFunc.scopes.pop(); // pop off the scope for this block
    } else if (CAstNode.type === "ReturnStatement") {
      const n = CAstNode as ReturnStatement;
      if (enclosingFunc.name !== "main") {
        // main shouldnt have any return for wasm
        addStatement(
          {
            type: "ReturnStatement",
            value: evaluateExpression(n.value, enclosingFunc),
          },
          enclosingFunc,
          enclosingBody
        );
      }
    } else if (CAstNode.type === "Initialization") {
      const n = CAstNode as Initialization;
      enclosingFunc.scopes[enclosingFunc.scopes.length - 1].add(n.name);
      const v: WasmLocalVariable = {
        type: "LocalVariable",
        name: convertVarNameToScopedVarName(
          n.name,
          enclosingFunc.scopes.length - 1
        ),
        size: variableSizes[n.variableType],
        bpOffset: enclosingFunc.bpOffset,
      };
      enclosingFunc.bpOffset += variableSizes[n.variableType]; // increment bpOffset by size of the variable
      enclosingFunc.locals[v.name] = v;
      addStatement(
        {
          type: "MemoryStore",
          addr: getVariableAddr(n.name, enclosingFunc),
          value: evaluateExpression(n.value, enclosingFunc),
          varType: variableTypeToWasmType[n.variableType],
          numOfBytes: variableSizes[n.variableType],
        },
        enclosingFunc,
        enclosingBody
      );
    } else if (CAstNode.type === "VariableDeclaration") {
      const n = CAstNode as VariableDeclaration;
      enclosingFunc.scopes[enclosingFunc.scopes.length - 1].add(n.name);
      const localVar: WasmLocalVariable = {
        type: "LocalVariable",
        name: convertVarNameToScopedVarName(
          n.name,
          enclosingFunc.scopes.length - 1
        ),
        size: variableSizes[n.variableType],
        bpOffset: enclosingFunc.bpOffset,
      };
      enclosingFunc.bpOffset += variableSizes[n.variableType];
      enclosingFunc.locals[localVar.name] = localVar;
    } else if (CAstNode.type === "Assignment") {
      const n = CAstNode as Assignment;
      const wasmVariableName = getWasmVariableName(
        n.variable.name,
        enclosingFunc
      );
      addStatement(
        {
          type: "MemoryStore",
          addr: getVariableAddr(wasmVariableName, enclosingFunc),
          value: evaluateExpression(n.value, enclosingFunc),
          varType: variableTypeToWasmType[n.variable.variableType],
          numOfBytes: variableSizes[n.variable.variableType],
        },
        enclosingFunc,
        enclosingBody
      );
    } else if (CAstNode.type === "FunctionCallStatement") {
      const n = CAstNode as FunctionCallStatement;
      addStatement(
        {
          type: "FunctionCallStatement",
          name: n.name,
          stackFrameSetup: getFunctionCallStackFrameSetupStatements(
            n,
            enclosingFunc
          ),
          hasReturn: wasmRoot.functions[n.name].return !== null,
        },
        enclosingFunc,
        enclosingBody
      );
    } else if (
      CAstNode.type === "PrefixExpression" ||
      CAstNode.type === "PostfixExpression"
    ) {
      // handle the case where a prefix or postfix expression is used as a statement, not an expression.
      const n = CAstNode as PrefixExpression | PostfixExpression;
      const addr = getVariableAddr(n.variable.name, enclosingFunc);
      const varType = variableTypeToWasmType[n.variable.variableType];

      const localMemStore: WasmMemoryStore = {
        type: "MemoryStore",
        addr,
        value: {
          type: "ArithmeticExpression",
          operator: unaryOperatorToBinaryOperator[n.operator],
          leftExpr: {
            type: "MemoryLoad",
            addr,
            varType: variableTypeToWasmType[n.variable.variableType],
            numOfBytes: variableSizes[n.variable.variableType],
          },
          rightExpr: {
            type: "Const",
            variableType: varType,
            value: 1,
          },
          varType: varType,
        },
        varType: variableTypeToWasmType[n.variable.variableType],
        numOfBytes: variableSizes[n.variable.variableType],
      };
      addStatement(localMemStore, enclosingFunc, enclosingBody);
    } else if (CAstNode.type === "CompoundAssignment") {
      const n = CAstNode as CompoundAssignment;
      const wasmVariableName = getWasmVariableName(
        n.variable.name,
        enclosingFunc
      );
      const addr = getVariableAddr(wasmVariableName, enclosingFunc);
      const arithmeticExpr: WasmArithmeticExpression = {
        type: "ArithmeticExpression",
        operator: n.operator,
        varType: variableTypeToWasmType[n.variable.variableType],
        leftExpr: {
          type: "MemoryLoad",
          addr,
          varType: variableTypeToWasmType[n.variable.variableType],
          numOfBytes: variableSizes[n.variable.variableType],
        },
        rightExpr: evaluateExpression(n.value, enclosingFunc),
      };
      // parameter assignment or assignment to local scope variable
      addStatement(
        {
          type: "MemoryStore",
          addr,
          value: arithmeticExpr,
          varType: variableTypeToWasmType[n.variable.variableType],
          numOfBytes: variableSizes[n.variable.variableType],
        },
        enclosingFunc,
        enclosingBody
      );
    } else if (CAstNode.type === "SelectStatement") {
      const n = CAstNode as SelectStatement;
      const actions: WasmStatement[] = [];
      visit(n.ifBlock.block, enclosingFunc, actions); // visit all the actions inside the if block
      const rootNode: WasmSelectStatement = {
        type: "SelectStatement",
        condition: evaluateExpression(n.ifBlock.condition, enclosingFunc),
        actions,
        elseStatements: [],
      };
      let currNode = rootNode;
      for (const elseIfBlock of n.elseIfBlocks) {
        const actions: WasmStatement[] = [];
        visit(elseIfBlock.block, enclosingFunc, actions);
        const elseIfNode: WasmSelectStatement = {
          type: "SelectStatement",
          condition: evaluateExpression(elseIfBlock.condition, enclosingFunc),
          actions,
          elseStatements: [],
        };
        currNode.elseStatements = [elseIfNode];
        currNode = elseIfNode;
      }
      if (n.elseBlock) {
        const elseActions: WasmStatement[] = [];
        visit(n.elseBlock, enclosingFunc, elseActions);
        currNode.elseStatements = elseActions;
      }
      addStatement(rootNode, enclosingFunc, enclosingBody);
    } else if (CAstNode.type === "DoWhileLoop") {
      const n = CAstNode as DoWhileLoop;
      const loopLabel = `loop_${(enclosingFunc.loopCount++).toString()}`;
      const body: WasmStatement[] = [];
      visit(n.body, enclosingFunc, body); // visit all the statements in the body of the do while loop
      // add the branching statement at end of loop body
      body.push({
        type: "BranchIf",
        label: loopLabel,
        condition: evaluateExpression(n.condition, enclosingFunc),
      });
      addStatement(
        {
          type: "Loop",
          label: loopLabel,
          body,
        },
        enclosingFunc,
        enclosingBody
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
          expr: evaluateExpression(n.condition, enclosingFunc),
        },
      });
      visit(n.body, enclosingFunc, body); // visit all the statements in the body of the while loop
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
        enclosingBody
      );
    } else if (CAstNode.type === "ForLoop") {
      const n = CAstNode as ForLoop;
      const blockLabel = `block_${(enclosingFunc.blockCount++).toString()}`;
      const loopLabel = `loop_${(enclosingFunc.loopCount++).toString()}`;
      enclosingFunc.scopes.push(new Set()); // push on new scope for this for loop initialization
      visit(n.initialization, enclosingFunc, enclosingBody); // add init statement for for loop
      const body: WasmStatement[] = [];
      // add the branch if statement to start of loop body
      body.push({
        type: "BranchIf",
        label: blockLabel,
        condition: {
          type: "BooleanExpression",
          isNegated: true,
          expr: evaluateExpression(n.condition, enclosingFunc),
        },
      });
      visit(n.body, enclosingFunc, body); // visit all the statements in the body of the for loop
      // add the for loop update expression
      visit(n.update, enclosingFunc, body);
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
        enclosingBody
      );
    }
  }

  /**
   * Function to evaluate a binary expression node, evaluating and building wasm nodes
   * of all the subexpressions of the ArithmeticExpression.
   * TODO: support different type of ops other than i32 ops.
   */
  function evaluateLeftToRightBinaryExpression(
    node: ArithmeticExpression | ComparisonExpression,
    enclosingFunc: WasmFunction
  ) {
    const rootNode: any = { type: node.type };
    // the last expression in expression series will be considered right expression (we do this to ensure left-to-rigth evaluation )
    let currNode = rootNode;
    for (let i = node.exprs.length - 1; i > 0; --i) {
      currNode.operator = node.exprs[i].operator;
      currNode.rightExpr = evaluateExpression(
        node.exprs[i].expr,
        enclosingFunc
      );
      currNode.leftExpr = { type: node.type };
      currNode = currNode.leftExpr;
    }
    currNode.operator = node.exprs[0].operator;
    currNode.rightExpr = evaluateExpression(node.exprs[0].expr, enclosingFunc);
    currNode.leftExpr = evaluateExpression(node.firstExpr, enclosingFunc);
    return rootNode;
  }

  function isConditionalExpression(node: Expression) {
    return node.type === "ConditionalExpression";
  }

  /**
   * Produces the correct left to right evaluation of a conditional expression,
   * in terms of WasmOrExpression or WasmAndExpression.
   */
  function evaluateConditionalExpression(
    node: ConditionalExpression,
    enclosingFunc: WasmFunction
  ) {
    const wasmNodeType =
      node.conditionType === "or" ? "OrExpression" : "AndExpression";
    const rootNode: any = { type: wasmNodeType };
    // the last expression in expression series will be considered right expression (we do this to ensure left-to-rigth evaluation )
    // each expression must be converted into a boolean expression
    let currNode = rootNode;
    for (let i = node.exprs.length - 1; i > 1; --i) {
      if (isConditionalExpression(node.exprs[i])) {
        // no need to wrap inside a BooleanExpression if it was already a conditional expression
        currNode.rightExpr = evaluateExpression(node.exprs[i], enclosingFunc);
      } else {
        currNode.rightExpr = {
          type: "BooleanExpression",
          expr: evaluateExpression(node.exprs[i], enclosingFunc),
        };
      }
      currNode.leftExpr = { type: wasmNodeType };
      currNode = currNode.leftExpr;
    }
    if (isConditionalExpression(node.exprs[1])) {
      // no need to wrap inside a BooleanExpression if it was already a conditional expression
      currNode.rightExpr = evaluateExpression(node.exprs[1], enclosingFunc);
    } else {
      currNode.rightExpr = {
        type: "BooleanExpression",
        expr: evaluateExpression(node.exprs[1], enclosingFunc),
      };
    }

    if (isConditionalExpression(node.exprs[0])) {
      currNode.leftExpr = evaluateExpression(node.exprs[0], enclosingFunc);
    } else {
      currNode.leftExpr = {
        type: "BooleanExpression",
        expr: evaluateExpression(node.exprs[0], enclosingFunc),
      };
    }
    return rootNode;
  }

  /**
   * Function that evaluates a given C expression and returns the corresponding WASM expression.
   */
  function evaluateExpression(
    expr: Expression,
    enclosingFunc: WasmFunction
  ): WasmExpression {
    if (expr.type === "Integer") {
      const n = expr as Integer;
      return convertLiteralToConst(n);
    } else if (expr.type === "FunctionCall") {
      const n = expr as FunctionCall;
      return {
        type: "FunctionCall",
        name: n.name,
        stackFrameSetup: getFunctionCallStackFrameSetupStatements(
          n,
          enclosingFunc
        ),
      };
    } else if (expr.type === "VariableExpr") {
      const n = expr as VariableExpr;
      const wasmVariableName = getWasmVariableName(n.name, enclosingFunc);
      // the expression is a function parameter OR a local variable
      return {
        type: "MemoryLoad",
        addr: getVariableAddr(wasmVariableName, enclosingFunc),
        varType: variableTypeToWasmType[n.variableType],
        numOfBytes: variableSizes[n.variableType],
      };
    } else if (
      expr.type === "ArithmeticExpression" ||
      expr.type === "ComparisonExpression"
    ) {
      const n = expr as ArithmeticExpression | ComparisonExpression;
      return evaluateLeftToRightBinaryExpression(n, enclosingFunc);
    } else if (expr.type === "PrefixExpression") {
      const n: PrefixExpression = expr as PrefixExpression;
      const wasmVariableName = getWasmVariableName(
        n.variable.name,
        enclosingFunc
      );
      const addr = getVariableAddr(wasmVariableName, enclosingFunc);
      const wasmNode: WasmMemoryLoad = {
        type: "MemoryLoad",
        addr,
        preStatements: [
          {
            type: "MemoryStore",
            addr,
            value: {
              type: "ArithmeticExpression",
              operator: unaryOperatorToBinaryOperator[n.operator],
              leftExpr: {
                type: "MemoryLoad",
                addr,
                varType: variableTypeToWasmType[n.variable.variableType],
                numOfBytes: variableSizes[n.variable.variableType],
              },
              rightExpr: {
                type: "Const",
                variableType: "i32",
                value: 1,
              },
              varType: "i32",
            },
            varType: variableTypeToWasmType[n.variable.variableType],
            numOfBytes: variableSizes[n.variable.variableType],
          },
        ],
        varType: variableTypeToWasmType[n.variable.variableType],
        numOfBytes: variableSizes[n.variable.variableType],
      };
      return wasmNode;
    } else if (expr.type === "PostfixExpression") {
      const n: PostfixExpression = expr as PostfixExpression;
      const wasmVariableName = getWasmVariableName(
        n.variable.name,
        enclosingFunc
      );
      const addr = getVariableAddr(wasmVariableName, enclosingFunc);
      const wasmNode: WasmMemoryStore = {
        type: "MemoryStore",
        addr,
        value: {
          type: "ArithmeticExpression",
          operator: unaryOperatorToBinaryOperator[n.operator],
          leftExpr: {
            type: "MemoryLoad",
            addr,
            preStatements: [
              {
                type: "MemoryLoad",
                addr,
                varType: variableTypeToWasmType[n.variable.variableType],
                numOfBytes: variableSizes[n.variable.variableType],
              },
            ],
            varType: variableTypeToWasmType[n.variable.variableType],
            numOfBytes: variableSizes[n.variable.variableType],
          },
          rightExpr: {
            type: "Const",
            variableType: "i32",
            value: 1,
          },
          varType: "i32",
        },
        varType: variableTypeToWasmType[n.variable.variableType],
        numOfBytes: variableSizes[n.variable.variableType],
      };
      return wasmNode;
    } else if (expr.type === "ConditionalExpression") {
      const n = expr as ConditionalExpression;
      return evaluateConditionalExpression(n, enclosingFunc);
    } else if (expr.type === "AssignmentExpression") {
      const n = expr as AssignmentExpression;
      const wasmVariableName = getWasmVariableName(
        n.variable.name,
        enclosingFunc
      );
      const addr = getVariableAddr(wasmVariableName, enclosingFunc);
      return {
        type: "MemoryLoad",
        addr,
        preStatements: [
          {
            type: "MemoryStore",
            addr,
            value: evaluateExpression(n.value, enclosingFunc),
            varType: variableTypeToWasmType[n.variable.variableType],
            numOfBytes: variableSizes[n.variable.variableType],
          },
        ],
        varType: variableTypeToWasmType[n.variable.variableType],
        numOfBytes: variableSizes[n.variable.variableType],
      };
    } else if (expr.type === "CompoundAssignmentExpression") {
      const n = expr as CompoundAssignmentExpression;
      const wasmVariableName = getWasmVariableName(
        n.variable.name,
        enclosingFunc
      );
      const addr = getVariableAddr(wasmVariableName, enclosingFunc);
      return {
        type: "MemoryLoad",
        addr,
        preStatements: [
          {
            type: "MemoryStore",
            addr,
            value: {
              type: "ArithmeticExpression",
              operator: n.operator,
              leftExpr: {
                type: "MemoryLoad",
                addr,
                varType: variableTypeToWasmType[n.variable.variableType],
                numOfBytes: variableSizes[n.variable.variableType],
              },
              rightExpr: evaluateExpression(n.value, enclosingFunc),
              varType: variableTypeToWasmType[n.variable.variableType],
            },
            varType: variableTypeToWasmType[n.variable.variableType],
            numOfBytes: variableSizes[n.variable.variableType],
          },
        ],
        varType: variableTypeToWasmType[n.variable.variableType],
        numOfBytes: variableSizes[n.variable.variableType],
      };
    } else {
      console.assert(
        false,
        `WASM TRANSLATION ERROR: Unhandled C expression node\n${expr}`
      );
    }
  }

  for (const child of CAstRoot.children) {
    if (child.type === "FunctionDefinition") {
      const n = child as FunctionDefinition;
      let bpOffset = WASM_ADDR_SIZE; // BP offset starts at the address of first param, so need account for BP pointing to the addr of old BP
      const params: Record<string, WasmFunctionParameter> = {};
      n.parameters.forEach((param, paramIndex) => {
        const paramName = generateParamName(param.name);
        params[paramName] = {
          type: "FunctionParameter",
          name: paramName,
          size: variableSizes[param.variableType],
          paramIndex,
          bpOffset,
        };
        bpOffset += variableSizes[param.variableType];
      });
      const f: WasmFunction = {
        type: "Function",
        name: n.name,
        params,
        sizeOfLocals: n.sizeOfLocals,
        sizeOfParams: n.sizeOfParameters,
        loopCount: 0,
        blockCount: 0,
        locals: {},
        scopes: [new Set()],
        body: [],
        return:
          n.returnType === "void" || n.name === "main"
            ? null
            : variableTypeToWasmType[n.returnType],
        bpOffset,
      };
      wasmRoot.functions[f.name] = f;
    } else if (child.type === "VariableDeclaration") {
      const n = child as VariableDeclaration;
      const globalVar: WasmDataSegmentVariable = {
        type: "DataSegmentVariable",
        name: n.name,
        size: variableSizes[n.variableType],
        memoryAddr: getGlobalMemoryAddr(n.variableType),
      };
      wasmRoot.globals[n.name] = globalVar;
    } else if (child.type === "Initialization") {
      const n = child as Initialization;
      const globalVar: WasmDataSegmentVariable = {
        type: "DataSegmentVariable",
        name: n.name,
        size: variableSizes[n.variableType],
        initializerValue: convertLiteralToConst(n.value as Literal),
        memoryAddr: getGlobalMemoryAddr(n.variableType),
      };
      wasmRoot.globals[n.name] = globalVar;
    }
  }

  wasmRoot.globalWasmVariables.push({
    type: "GlobalVariable",
    name: STACK_POINTER,
    variableType: "i32",
    initializerValue: {
      type: "Const",
      variableType: "i32",
      value:
        wasmRoot.memorySize * WASM_PAGE_SIZE -
        wasmRoot.functions["main"].sizeOfLocals, // preallocate space for main's local variables
    },
  });
  wasmRoot.globalWasmVariables.push({
    type: "GlobalVariable",
    name: BASE_POINTER,
    variableType: "i32",
    initializerValue: {
      type: "Const",
      variableType: "i32",
      value: wasmRoot.memorySize * WASM_PAGE_SIZE, // BP starts at the memory boundary
    },
  });
  // heap segment follows immediately after data segment
  wasmRoot.globalWasmVariables.push({
    type: "GlobalVariable",
    name: HEAP_POINTER,
    variableType: "i32",
    initializerValue: {
      type: "Const",
      variableType: "i32",
      value: Math.ceil(currMemoryOffset / 4) * 4, // align to 4 byte boundary
    },
  });

  wasmRoot.globalWasmVariables.push({
    type: "GlobalVariable",
    name: REG_1,
    variableType: "i32",
    initializerValue: {
      type: "Const",
      variableType: "i32",
      value: 0, // align to 4 byte boundary
    },
  });

  wasmRoot.globalWasmVariables.push({
    type: "GlobalVariable",
    name: REG_2,
    variableType: "i32",
    initializerValue: {
      type: "Const",
      variableType: "i32",
      value: 0, // align to 4 byte boundary
    },
  });

  // visit all the child nodes of function definitions
  // do this only after all the globals and function information have been set
  for (const child of CAstRoot.children) {
    if (child.type === "FunctionDefinition") {
      const n = child as FunctionDefinition;
      for (const child of n.body.children) {
        visit(child, wasmRoot.functions[n.name]);
      }
    }
  }

  if (testMode) {
    // find the main function and add the logging code for the locals
    for (const child of CAstRoot.children) {
      if (child.type === "FunctionDefinition" && child.name === 'main') {
        for (const statement of child.body.children) {
          if (statement.type === "Initialization" || statement.type === "VariableDeclaration") {
            // add logs at end of main wasm code to log the values of these variables in order of declaration
            addStatement({
              type: "Log",
              value: {
                type: "MemoryLoad",
                addr: getVariableAddr(`${statement.name}_0`, wasmRoot.functions["main"]),
                varType: variableTypeToWasmType[statement.variableType],
                numOfBytes: variableSizes[statement.variableType],
              }
            }, wasmRoot.functions["main"])
          }
        }
      }
    }
  }

  return wasmRoot;
}
