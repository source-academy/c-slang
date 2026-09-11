import {
  BinaryOperator,
  TypedExpression,
  TypedStatement,
  UnaryOperator,
} from "../ast/types";
import { ArithmeticType, ScalarType, Void } from "../typing/types";
import { AgendaItem, isInstruction } from "./agenda";
import { StashItem } from "./stash";

export enum InstructionType {
  UNARY_OP = "UnaryOp",
  BINARY_OP = "BinaryOp",
  POP = "Pop",
  PUSH = "Push",
  ASSIGN = "Assign",
  MARK = "Mark",
  EXIT = "Exit",
  CALL = "Call",
  RETURN = "Return",
  BRANCH = "Branch",
  ARITHMETIC_CONVERSION = "ArithmeticConversion",
  CAST = "Cast",
  ARRAY_SUBSCRIPT = "ArraySubscript",
  EXIT_BLOCK = "ExitBlock",
  WHILE = "While",
  FOR = "For",
  BREAK_MARK = "BreakMark",
  CONTINUE_MARK = "ContinueMark",
}

export interface BaseInstruction {
  type: InstructionType;
}

export interface UnaryOpInstruction extends BaseInstruction {
  type: InstructionType.UNARY_OP;
  op: UnaryOperator;
}

export const unaryOpInstruction = (op: UnaryOperator): UnaryOpInstruction => ({
  type: InstructionType.UNARY_OP,
  op,
});

export interface BinaryOpInstruction extends BaseInstruction {
  type: InstructionType.BINARY_OP;
  op: BinaryOperator;
}

export const binaryOpInstruction = (
  op: BinaryOperator,
): BinaryOpInstruction => ({
  type: InstructionType.BINARY_OP,
  op,
});

export interface PopInstruction extends BaseInstruction {
  type: InstructionType.POP;
}

export const popInstruction = (): PopInstruction => ({
  type: InstructionType.POP,
});

export interface PushInstruction extends BaseInstruction {
  type: InstructionType.PUSH;
  item: StashItem;
}

export const pushInstruction = (item: StashItem): PushInstruction => ({
  type: InstructionType.PUSH,
  item,
});

export interface AssignInstruction extends BaseInstruction {
  type: InstructionType.ASSIGN;
}

export const assignInstruction = (): AssignInstruction => ({
  type: InstructionType.ASSIGN,
});

export interface MarkInstruction extends BaseInstruction {
  type: InstructionType.MARK;
}

export const markInstruction = (): MarkInstruction => ({
  type: InstructionType.MARK,
});

export interface BreakMarkInstruction extends BaseInstruction {
  type: InstructionType.BREAK_MARK;
}

export const breakMarkInstruction = (): BreakMarkInstruction => ({
  type: InstructionType.BREAK_MARK,
});

export interface ContinueMarkInstruction extends BaseInstruction {
  type: InstructionType.CONTINUE_MARK;
}

export const continueMarkInstruction = (): ContinueMarkInstruction => ({
  type: InstructionType.CONTINUE_MARK,
});

export function isBreakMarkInstruction(
  i: AgendaItem,
): i is BreakMarkInstruction {
  return isInstruction(i) && i.type == InstructionType.BREAK_MARK;
}

export function isContinueMarkInstruction(
  i: AgendaItem,
): i is ContinueMarkInstruction {
  return isInstruction(i) && i.type == InstructionType.CONTINUE_MARK;
}

export function isMarkInstruction(i: AgendaItem): i is MarkInstruction {
  return isInstruction(i) && i.type == InstructionType.MARK;
}

export interface ExitInstruction extends BaseInstruction {
  type: InstructionType.EXIT;
}

export const exitInstruction = (): ExitInstruction => ({
  type: InstructionType.EXIT,
});

export interface CallInstruction extends BaseInstruction {
  type: InstructionType.CALL;
  arity: number;
}

export const callInstruction = (arity: number): CallInstruction => ({
  type: InstructionType.CALL,
  arity,
});

export const isCallInstruction = (i: Instruction): i is CallInstruction =>
  i.type === InstructionType.CALL;

export interface ReturnInstruction extends BaseInstruction {
  type: InstructionType.RETURN;
}

export const returnInstruction = (): ReturnInstruction => ({
  type: InstructionType.RETURN,
});

export const isReturnInstruction = (i: AgendaItem): i is ReturnInstruction =>
  isInstruction(i) && i.type === InstructionType.RETURN;

export interface BranchInstruction extends BaseInstruction {
  type: InstructionType.BRANCH;
  exprIfTrue: TypedExpression | TypedStatement;
  exprIfFalse: TypedExpression | TypedStatement | null;
}

export const branchInstruction = (
  exprIfTrue: TypedExpression | TypedStatement,
  exprIfFalse: TypedExpression | TypedStatement | null,
): BranchInstruction => ({
  type: InstructionType.BRANCH,
  exprIfTrue,
  exprIfFalse,
});

export interface ArithmeticConversionInstruction extends BaseInstruction {
  type: InstructionType.ARITHMETIC_CONVERSION;
  typeInfo: ArithmeticType;
}

export const arithmeticConversionInstruction = (
  typeInfo: ArithmeticType,
): ArithmeticConversionInstruction => ({
  type: InstructionType.ARITHMETIC_CONVERSION,
  typeInfo,
});

export interface CastInstruction extends BaseInstruction {
  type: InstructionType.CAST;
  targetType: Void | ScalarType;
}

export const castInstruction = (
  targetType: Void | ScalarType,
): CastInstruction => ({ type: InstructionType.CAST, targetType });

export interface ArraySubscriptInstruction extends BaseInstruction {
  type: InstructionType.ARRAY_SUBSCRIPT;
  evaluateAsLvalue: boolean;
}

export const arraySubscriptInstruction = (
  evaluateAsLvalue: boolean = false,
): ArraySubscriptInstruction => ({
  type: InstructionType.ARRAY_SUBSCRIPT,
  evaluateAsLvalue,
});

export interface ExitBlockInstruction extends BaseInstruction {
  type: InstructionType.EXIT_BLOCK;
}

export const exitBlockInstruction = (): ExitBlockInstruction => ({
  type: InstructionType.EXIT_BLOCK,
});

export function isExitBlockInstruction(
  i: AgendaItem,
): i is ExitBlockInstruction {
  return isInstruction(i) && i.type == InstructionType.EXIT_BLOCK;
}

export interface WhileInstruction extends BaseInstruction {
  type: InstructionType.WHILE;
  cond: TypedExpression;
  body: TypedStatement;
}

export const whileInstruction = (
  cond: TypedExpression,
  body: TypedStatement,
): WhileInstruction => ({
  type: InstructionType.WHILE,
  cond,
  body,
});

export interface ForInstruction extends BaseInstruction {
  type: InstructionType.FOR;
  cond: TypedExpression;
  body: TypedStatement;
  afterIter: TypedExpression | null;
}

export const forInstruction = (
  cond: TypedExpression,
  body: TypedStatement,
  afterIter: TypedExpression | null,
): ForInstruction => ({
  type: InstructionType.FOR,
  cond,
  body,
  afterIter,
});

export type Instruction =
  | UnaryOpInstruction
  | BinaryOpInstruction
  | PopInstruction
  | PushInstruction
  | MarkInstruction
  | ExitInstruction
  | CallInstruction
  | ReturnInstruction
  | BranchInstruction
  | AssignInstruction
  | ArithmeticConversionInstruction
  | CastInstruction
  | ArraySubscriptInstruction
  | ExitBlockInstruction
  | WhileInstruction
  | ForInstruction
  | BreakMarkInstruction
  | ContinueMarkInstruction;
