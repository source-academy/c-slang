/**
 * This file contains the typescript interfaces for each astNode.
 */
interface Point {
  line: number;
  offset: number;
  column: number;
}

export interface Position {
  start: Point;
  end: Point;
}

export interface Node {
  type: string;
  position: Position;
}

// Modified versions of Node and Parent respectively to contain scope infr
export interface ScopedNode extends Node {
  scope: Scope;
}

// Contains all variables and functions declared in a lexical scope
export type Scope = {
  parentScope: Scope | undefined | null; // the parent scope that this scope is in
  functions: Record<string, Function>; // mapping from name of function to object that contains information on the function
  variables: Record<string, Variable>; // mapping from name of variable to object that contains information on the variable
};

// Contains the information of a declared function. To be stored in the scope of a ScopedParent.
export interface Function {
  returnType: VariableType | "void";
  name: string;
  parameters: Variable[];
}

// Contains information of a declared variable. To be stored in the scope of a ScopedParent.
export interface Variable {
  type: VariableType;
  name: string;
  isParam?: boolean; // to distinguish function parameters from regular vars
}

// Root represents the starting node of the AST
export interface Root extends ScopedNode {
  type: "Root";
  children: (Statement | FunctionDefinition)[];
}

type BlockItem = Statement | Block;

export interface Block extends ScopedNode {
  type: "Block";
  children: BlockItem[];
}

export interface SelectStatement extends ScopedNode {
  type: "SelectStatement";
  ifBlock: ConditionalBlock;
  elseIfBlocks: ConditionalBlock[];
  elseBlock?: Block | null;
}

export interface ConditionalBlock extends ScopedNode {
  type: "ConditionalBlock";
  condition: ConditionalExpression;
  block: Block;
}

export type VariableType = "int";

// to be expanded later to include proper expressions
export type Expression =
  | Literal
  | FunctionCall
  | VariableExpr
  | ArithmeticExpression
  | PostfixExpression
  | PrefixExpression
  | AndConditionalExpression
  | OrConditionalExpression;

export type Statement = Declaration | Initialization | ReturnStatement;

//TODO: See if literal is right
export interface ReturnStatement extends ScopedNode {
  type: "ReturnStatement";
  value: Expression;
}

//TODO: Find better name to distinguish from Variable in name
export interface VariableExpr extends ScopedNode {
  type: "VariableExpr";
  name: string; //name of the variable
  variableType: VariableType;
  isParam?: boolean;
}

export type BinaryOperator = "+" | "-" | "*" | "/" | "%";

export interface ArithmeticExpression extends ScopedNode {
  type: "ArithmeticExpression";
  firstExpr: Expression;
  exprs: ArithmeticSubExpression[]; // the array of experessions that are joined by the operator
}

// A constituent of a arithmetic expression. contains the operator that attaches this subexpession to the left subexpression.
export interface ArithmeticSubExpression extends ScopedNode {
  type: "ArithmeticSubExpression";
  operator: BinaryOperator;
  expr: Expression;
}

export interface ConditionalExpression extends ScopedNode {
  exprs: Expression[];
}

export interface OrConditionalExpression extends ConditionalExpression {
  type: "OrConditionalExpression";
}

export interface AndConditionalExpression extends ConditionalExpression {
  type: "AndConditionalExpression";
}

export type ComparisonOperator = "<" | "<=" | "!=" | "==" | ">=" | ">"

export interface ComparisonExpression extends ScopedNode {
  type: "ComparisonExpression";
  firstExpr: Expression;
  exprs: ComparisonSubExpression[];
}

export interface ComparisonSubExpression extends ScopedNode {
  type: "ComparisonSubExpression";
  operator: ComparisonOperator;
  expr: Expression;
}

export type UnaryOperator = "++" | "--";

export interface PrefixExpression extends ScopedNode {
  type: "PrefixExpression";
  operator: UnaryOperator;
  variable: VariableExpr; // the variable being prefix operated on
}

export interface PostfixExpression extends ScopedNode {
  type: "PostfixExpression";
  operator: UnaryOperator;
  variable: VariableExpr;
}

// For now literals are only ints TODO: need to handle other type + do overflow underflow checks of nubmers later
export type Literal = Integer;

export interface Integer extends ScopedNode {
  type: "Integer";
  value: number;
}

export interface Initialization extends ScopedNode {
  type: "Initialization";
  variableType: VariableType;
  name: string;
  value: Expression;
}

export type Declaration = VariableDeclaration | FunctionDeclaration;

export interface VariableDeclaration extends ScopedNode {
  type: "VariableDeclaration";
  variableType: VariableType;
  name: string;
}

// A variable assignment
export interface Assignment extends ScopedNode {
  type: "Assignment";
  variable: VariableExpr;
  value: Expression;
}

// Information on a function - return type, name and parameters
interface FunctionInformation {
  returnType: VariableType | "void";
  name: string;
  parameters: VariableDeclaration[];
}

export interface FunctionDeclaration extends FunctionInformation, ScopedNode {
  type: "FunctionDeclaration";
}

export interface FunctionDefinition extends FunctionInformation, ScopedNode {
  type: "FunctionDefinition";
  body: Block;
}

export interface FunctionCall extends ScopedNode {
  type: "FunctionCall";
  name: string;
  args: Expression[];
}

/**
 * This node is to differentiate from a function call used as an expression.
 */
export interface FunctionCallStatement extends ScopedNode {
  type: "FunctionCallStatement";
  name: string;
  args: Expression[];
  hasReturn: boolean;
}

type Operator = "+" | "-" | "/" | "*" | "%"

export interface CompoundAssignment extends ScopedNode {
  operator: Operator;
  variable: VariableExpr;
  value: Expression;
}