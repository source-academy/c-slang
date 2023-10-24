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
  functions: Record<string, FunctionDetails>; // mapping from name of function to object that contains information on the function
  variables: Record<string, Variable>; // mapping from name of variable to object that contains information on the variable
};

// Contains the information of a declared function. To be stored in the scope of a ScopedParent.
export interface FunctionDetails {
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

type BlockItem =
  | Statement
  | Block
  | ReturnStatement
  | SelectStatement
  | DoWhileLoop
  | WhileLoop
  | ForLoop;

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
  condition: Expression;
  block: Block;
}

export type VariableType = "int" | "char";

export interface Expression extends ScopedNode {
  variableType: VariableType // the type of the expression. to be filled before or after processing, depending on the expression type //TODO: not actually set in processor yet
}

// to be expanded later to include proper expressions
export type Expression2 =
  | Literal
  | FunctionCall
  | VariableExpr
  | ArithmeticExpression
  | PostfixExpression
  | PrefixExpression
  | ConditionalExpression
  | ComparisonExpression
  | AssignmentExpression
  | CompoundAssignmentExpression;

export type Statement = Declaration | Initialization;

//TODO: See if literal is right
export interface ReturnStatement extends ScopedNode {
  type: "ReturnStatement";
  value?: Expression;
}

//TODO: Find better name to distinguish from Variable in name
export interface VariableExpr extends Expression {
  type: "VariableExpr";
  name: string; //name of the variable
  variableType: VariableType;
  isParam?: boolean;
}

export type BinaryOperator = "+" | "-" | "*" | "/" | "%";

export interface ArithmeticExpression extends Expression {
  type: "ArithmeticExpression";
  firstExpr: Expression;
  exprs: ArithmeticSubExpression[]; // the array of experessions that are joined by the operator
}

// A constituent of a arithmetic expression. contains the operator that attaches this subexpession to the left subexpression.
export interface ArithmeticSubExpression extends Expression {
  type: "ArithmeticSubExpression";
  operator: BinaryOperator;
  expr: Expression;
}

export interface ConditionalExpression extends Expression {
  type: "ConditionalExpression";
  conditionType: "and" | "or";
  exprs: Expression[];
}

export type ComparisonOperator = "<" | "<=" | "!=" | "==" | ">=" | ">";

export interface ComparisonExpression extends Expression {
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

export interface PrefixExpression extends Expression {
  type: "PrefixExpression";
  operator: UnaryOperator;
  variable: VariableExpr; // the variable being prefix operated on
}

export interface PostfixExpression extends Expression {
  type: "PostfixExpression";
  operator: UnaryOperator;
  variable: VariableExpr;
}

// For now literals are only ints TODO: need to handle other type + do overflow underflow checks of nubmers later
export type Literal = Integer;

export interface Integer extends Expression {
  type: "Integer";
  variableType: "int",
  value: number;
}

export type Declaration = VariableDeclaration | FunctionDeclaration;

export interface VariableDeclaration extends ScopedNode {
  type: "VariableDeclaration";
  variableType: VariableType;
  name: string;
}

export interface Initialization extends ScopedNode {
  type: "Initialization";
  variableType: VariableType;
  name: string;
  value: Expression;
}

// A variable assignment
export interface Assignment extends ScopedNode {
  type: "Assignment";
  variable: VariableExpr;
  value: Expression;
}

/**
 * For the case when an assignment is used as an expression.
 */
export interface AssignmentExpression extends Expression {
  type: "AssignmentExpression";
  variable: VariableExpr;
  value: Expression;
}

// Information on a function - return type, name and parameters
interface FunctionInformation {
  returnType: VariableType | "void";
  name: string;
  parameters: VariableDeclaration[];
  sizeOfParameters: number; // size of all the parameters in bytes
}

export interface FunctionDeclaration extends FunctionInformation, ScopedNode {
  type: "FunctionDeclaration";
}

export interface FunctionDefinition extends FunctionInformation, ScopedNode {
  type: "FunctionDefinition";
  body: Block;
  sizeOfLocals: number; // size of all the locals in bytes
  sizeOfReturn: number; /// size of the return type
}

export interface FunctionCall extends Expression {
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
}

type Operator = "+" | "-" | "/" | "*" | "%";

export interface CompoundAssignment extends ScopedNode {
  type: "CompoundAssignment";
  operator: Operator;
  variable: VariableExpr;
  value: Expression;
}

export interface CompoundAssignmentExpression extends Expression {
  type: "CompoundAssignmentExpression";
  operator: Operator;
  variable: VariableExpr;
  value: Expression;
}

export interface IterationStatement extends ScopedNode {
  type: "DoWhileLoop" | "WhileLoop" | "ForLoop";
  condition: Expression;
  body: Block;
}

export interface DoWhileLoop extends IterationStatement {
  type: "DoWhileLoop";
}

export interface WhileLoop extends IterationStatement {
  type: "WhileLoop";
}

export interface ForLoop extends IterationStatement {
  type: "ForLoop";
  initialization: Statement;
  update: Expression;
}
