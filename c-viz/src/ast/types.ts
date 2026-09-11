import { has, isObject } from "lodash";
import {
  FunctionType,
  ObjectTypeInfo,
  ScalarType,
  TypeInfo,
  Void,
  int,
  FunctionReturnType
} from "../typing/types";

export interface PositionInfo {
  offset: number;
  line: number;
  column: number;
}

export interface BaseNode {
  type: string;
  start: PositionInfo;
  end: PositionInfo;
  src: string;
}

export type ASTNode =
  | TranslationUnit
  | FunctionDefinition
  | Declaration
  | InitDeclarator
  | CompoundStatement
  | JumpStatementReturn
  | JumpStatementContinue
  | JumpStatementBreak
  | IterationStatementWhile
  | IterationStatementDoWhile
  | IterationStatementFor
  | SelectionStatementIf
  | EmptyExpressionStatement
  | CommaOperator
  | CastExpressionNode
  | ExpressionStatement
  | InitializerList
  | AssignmentExpressionNode
  | ConditionalExpressionNode
  | BinaryExpressionNode
  | UnaryExpressionIncr
  | UnaryExpressionDecr
  | UnaryExpressionSizeof
  | UnaryExpressionNode
  | PostfixExpressionNode
  | ArraySubscriptingOp
  | FunctionCallOp
  | PointerMemberOp
  | StructMemberOp
  | PostfixIncrementOp
  | PostfixDecrementOp
  | PrimaryExprIdentifier
  | PrimaryExprConstant
  | PrimaryExprString
  | PrimaryExprParenthesis
  | IntegerConstant;

export type TypedASTNode =
  | TypedTranslationUnit
  | TypedFunctionDefinition
  | TypedDeclaration
  | TypedInitDeclarator
  | TypedefDeclaration
  | TypedCompoundStatement
  | TypedJumpStatementReturn
  | JumpStatementBreak
  | JumpStatementContinue
  | TypedIterationStatementWhile
  | TypedIterationStatementDoWhile
  | TypedIterationStatementFor
  | TypedSelectionStatementIf
  | EmptyExpressionStatement
  | TypedCommaOperator
  | TypedCastExpressionNode
  | TypedExpressionStatement
  | TypedInitializerList
  | TypedAssignmentExpressionNode
  | TypedConditionalExpressionNode
  | TypedBinaryExpressionNode
  | TypedUnaryExpressionIncr
  | TypedUnaryExpressionDecr
  | TypedUnaryExpressionNode
  | TypedUnaryExpressionSizeof
  | TypedPostfixExpressionNode
  | TypedArraySubscriptingOp
  | TypedFunctionCallOp
  | TypedPointerMemberOp
  | TypedStructMemberOp
  | TypedPostfixIncrementOp
  | TypedPostfixDecrementOp
  | TypedPrimaryExprIdentifier
  | TypedPrimaryExprConstant
  | TypedPrimaryExprString
  | TypedPrimaryExprParenthesis;

export interface TranslationUnit extends BaseNode {
  type: "TranslationUnit";
  value: ExternalDeclaration[];
}

export interface TypedTranslationUnit extends BaseNode {
  type: "TranslationUnit";
  value: TypedExternalDeclaration[];
}

export type ExternalDeclaration = FunctionDefinition | Declaration;

export type TypedExternalDeclaration =
  | TypedFunctionDefinition
  | TypedDeclaration
  | TypedefDeclaration;

export interface FunctionDefinition extends BaseNode {
  type: "FunctionDefinition";
  specifiers: DeclarationSpecifiers;
  declarator: Declarator;
  body: CompoundStatement;
}

export const isFunctionDefinition = (i: BaseNode): i is FunctionDefinition =>
  i.type === "FunctionDefinition";

export interface TypedFunctionDefinition extends BaseNode {
  type: "FunctionDefinition";
  identifier: Identifier;
  typeInfo: FunctionType;
  body: TypedCompoundStatement;
}

export interface Declaration extends BaseNode {
  type: "Declaration";
  specifiers: DeclarationSpecifiers;
  declaratorList: InitDeclarator[];
}

export const isDeclaration = (i: BaseNode): i is Declaration =>
  i.type === "Declaration";

export interface TypedDeclaration extends BaseNode {
  type: "Declaration";
  declaratorList: TypedInitDeclarator[];
}

export const isTypedDeclaration = (i: TypedBlockItem): i is TypedDeclaration =>
  i.type === "Declaration";

export interface TypedefDeclaration extends BaseNode {
  type: "TypedefDeclaration";
  declaratorList: Typedef[];
}

export const isTypedefDeclaration = (i: BaseNode): i is TypedefDeclaration =>
  i.type === "TypedefDeclaration";

export type DeclarationSpecifiers = DeclarationSpecifier[];

export type DeclarationSpecifier = TypeSpecifier | StorageClassSpecifier;

export type TypeSpecifier =
  | "void"
  | "char"
  | "short"
  | "int"
  | "long"
  | "signed"
  | "unsigned"
  | "_Bool"
  | StructSpecifier
  | TypedefName;

export const isTypeSpecifier = (i: DeclarationSpecifier): i is TypeSpecifier =>
  !isStorageClassSpecifier(i);

export type TypedefName = string;

export type StorageClassSpecifier = "typedef";

export const isStorageClassSpecifier = (
  i: DeclarationSpecifier,
): i is StorageClassSpecifier => i === "typedef";

export interface StructSpecifier extends BaseNode {
  type: "StructSpecifier";
  identifier: Identifier | null;
  declarationList: Declaration[];
}

export const isStructSpecifier = (i: TypeSpecifier): i is StructSpecifier =>
  typeof i === "object";

export interface InitDeclarator extends BaseNode {
  type: "InitDeclarator";
  declarator: Declarator;
  initializer: Initializer | null;
}

export interface TypedInitDeclarator extends BaseNode {
  type: "InitDeclarator";
  identifier: Identifier;
  qualifiedIdentifier?: Identifier;
  typeInfo: ObjectTypeInfo;
  initializer: TypedInitializer | null;
}

export interface Typedef extends BaseNode {
  type: "Typedef";
  identifier: Identifier;
  typeInfo: TypeInfo;
}

export const isTypedef = (i: BaseNode): i is Typedef => i.type === "Typedef";

export type Initializer = AssignmentExpression | InitializerList;

export type TypedInitializer = TypedAssignmentExpression | TypedInitializerList;

export const isTypedInitializerList = (
  i: TypedInitializer,
): i is TypedInitializerList => i.type === "InitializerList";

export interface InitializerList extends BaseNode {
  type: "InitializerList";
  value: DesignationAndInitializer[];
}

export const isInitializerList = (i: BaseNode): i is InitializerList =>
  i.type === "InitializerList";

export interface TypedInitializerList extends BaseNode {
  type: "InitializerList";
  value: TypedDesignationAndInitializer[];
}

export interface DesignationAndInitializer {
  designation: Designator[];
  initializer: Initializer;
}

export interface TypedDesignationAndInitializer {
  designation: TypedDesignator[];
  initializer: TypedInitializer;
}

export type Designator = ArrayDesignator | StructDesignator;

export type TypedDesignator = TypedArrayDesignator | TypedStructDesignator;

export interface ArrayDesignator {
  type: "arrayDesignator";
  idx: IntegerConstant;
}

export const isArrayDesignator = (i: Designator): i is ArrayDesignator =>
  i.type === "arrayDesignator";

export interface TypedArrayDesignator {
  type: "arrayDesignator";
  idx: TypedIntegerConstant;
  typeInfo: ObjectTypeInfo;
}

export const isTypedArrayDesignator = (
  i: TypedDesignator,
): i is TypedArrayDesignator => i.type === "arrayDesignator";

export interface StructDesignator {
  type: "structDesignator";
  identifier: Identifier;
}

export interface TypedStructDesignator {
  type: "structDesignator";
  identifier: Identifier;
  typeInfo: ObjectTypeInfo;
}

export type Declarator = DeclaratorPart[];

export type DeclaratorPart =
  | IdentifierDeclaratorPart
  | ArrayDeclaratorPart
  | FunctionDeclaratorPart
  | PtrDeclaratorPart;

export type BaseDeclaratorPart = {
  partType: string;
} & (
  | IdentifierDeclaratorPart
  | ArrayDeclaratorPart
  | FunctionDeclaratorPart
  | PtrDeclaratorPart
);

export interface IdentifierDeclaratorPart {
  partType: "identifier";
  name: Identifier;
}

export const isIdentifierDeclaratorPart = (
  i: DeclaratorPart,
): i is IdentifierDeclaratorPart => i.partType === "identifier";

export interface ArrayDeclaratorPart {
  partType: "array";
  length: IntegerConstant;
}

export const isArrayDeclaratorPart = (
  i: DeclaratorPart,
): i is ArrayDeclaratorPart => i.partType === "array";

export interface FunctionDeclaratorPart {
  partType: "function";
  argTypes: ParameterDeclaration[];
}

export const isFunctionDeclaratorPart = (
  i: DeclaratorPart,
): i is FunctionDeclaratorPart => i.partType === "function";

export interface PtrDeclaratorPart {
  partType: "ptr";
}

export const isPtrDeclaratorPart = (
  i: DeclaratorPart,
): i is PtrDeclaratorPart => i.partType === "ptr";

export interface ParameterDeclaration {
  specifiers: DeclarationSpecifiers;
  declarator: Declarator | AbstractDeclarator;
}

export type AbstractDeclarator = AbstractDeclaratorPart[];

export type AbstractDeclaratorPart =
  | ArrayDeclaratorPart
  | FunctionDeclaratorPart
  | PtrDeclaratorPart;

export interface CompoundStatement extends BaseNode {
  type: "CompoundStatement";
  value: BlockItem[];
}

export const isCompoundStatement = (i: BaseNode): i is CompoundStatement =>
  i.type === "CompoundStatement";

export interface TypedCompoundStatement extends BaseNode {
  type: "CompoundStatement";
  value: TypedBlockItem[];
}

export const isTypedCompoundStatement = (
  i: TypedStatement,
): i is TypedCompoundStatement => i.type === "CompoundStatement";

export type BlockItem = Statement | Declaration;

export type TypedBlockItem =
  | TypedStatement
  | TypedDeclaration
  | TypedefDeclaration;

export type Statement =
  | CompoundStatement
  | ExpressionStatement
  | JumpStatement
  | IterationStatement
  | SelectionStatement;

export type TypedStatement =
  | TypedCompoundStatement
  | TypedExpressionStatement
  | TypedJumpStatement
  | TypedIterationStatement
  | TypedSelectionStatement;

export type JumpStatement =
  | JumpStatementReturn
  | JumpStatementContinue
  | JumpStatementBreak;

export const isJumpStatement = (i: BaseNode): i is JumpStatement =>
  isJumpStatementReturn(i) ||
  isJumpStatementContinue(i) ||
  isJumpStatementBreak(i);

export type TypedJumpStatement =
  | TypedJumpStatementReturn
  | JumpStatementContinue
  | JumpStatementBreak;

export interface JumpStatementReturn extends BaseNode {
  type: "JumpStatementReturn";
  value: Expression | null;
}

export const isJumpStatementReturn = (i: BaseNode): i is JumpStatementReturn =>
  i.type === "JumpStatementReturn";

export interface TypedJumpStatementReturn extends BaseNode {
  type: "JumpStatementReturn";
  value: TypedExpression | null;
  expectedReturnType: FunctionReturnType;
}

export interface JumpStatementContinue extends BaseNode {
  type: "JumpStatementContinue";
}

export const isJumpStatementContinue = (
  i: BaseNode,
): i is JumpStatementContinue => i.type === "JumpStatementContinue";

export interface JumpStatementBreak extends BaseNode {
  type: "JumpStatementBreak";
}

export const isJumpStatementBreak = (i: BaseNode): i is JumpStatementBreak =>
  i.type === "JumpStatementBreak";

export type IterationStatement =
  | IterationStatementWhile
  | IterationStatementDoWhile
  | IterationStatementFor;

export const isIterationStatement = (i: BaseNode): i is IterationStatement =>
  isIterationStatementWhile(i) ||
  isIterationStatementDoWhile(i) ||
  isIterationStatementFor(i);

export type TypedIterationStatement =
  | TypedIterationStatementWhile
  | TypedIterationStatementDoWhile
  | TypedIterationStatementFor;

export const isTypedIterationStatement = (
  i: TypedStatement,
): i is TypedIterationStatement =>
  isTypedIterationStatementWhile(i) ||
  isTypedIterationStatementDoWhile(i) ||
  isTypedIterationStatementFor(i);

export interface IterationStatementWhile extends BaseNode {
  type: "IterationStatementWhile";
  cond: Expression;
  body: Statement;
}

export const isIterationStatementWhile = (
  i: BaseNode,
): i is IterationStatementWhile => i.type === "IterationStatementWhile";

export interface TypedIterationStatementWhile extends BaseNode {
  type: "IterationStatementWhile";
  cond: TypedExpression;
  body: TypedStatement;
}

export const isTypedIterationStatementWhile = (
  i: TypedStatement,
): i is TypedIterationStatementWhile => i.type === "IterationStatementWhile";

export interface IterationStatementDoWhile extends BaseNode {
  type: "IterationStatementDoWhile";
  cond: Expression;
  body: Statement;
}

export const isIterationStatementDoWhile = (
  i: BaseNode,
): i is IterationStatementDoWhile => i.type === "IterationStatementDoWhile";

export interface TypedIterationStatementDoWhile extends BaseNode {
  type: "IterationStatementDoWhile";
  cond: TypedExpression;
  body: TypedStatement;
}

export const isTypedIterationStatementDoWhile = (
  i: TypedStatement,
): i is TypedIterationStatementDoWhile =>
  i.type === "IterationStatementDoWhile";

export interface IterationStatementFor extends BaseNode {
  type: "IterationStatementFor";
  init: Expression | Declaration | null;
  controlExpr: Expression | null;
  afterIterExpr: Expression | null;
  body: Statement;
}

export const isIterationStatementFor = (
  i: BaseNode,
): i is IterationStatementFor => i.type === "IterationStatementFor";

export interface TypedIterationStatementFor extends BaseNode {
  type: "IterationStatementFor";
  init: TypedExpression | null;
  controlExpr: TypedExpression | null;
  afterIterExpr: TypedExpression | null;
  body: TypedStatement;
}

export const isTypedIterationStatementFor = (
  i: TypedStatement,
): i is TypedIterationStatementFor => i.type === "IterationStatementFor";

export type SelectionStatement = SelectionStatementIf;

export const isSelectionStatement = (i: BaseNode): i is SelectionStatement =>
  isSelectionStatementIf(i);

export type TypedSelectionStatement = TypedSelectionStatementIf;

export const isTypedSelectionStatement = (
  i: TypedStatement,
): i is TypedSelectionStatement => isTypedSelectionStatementIf(i);

export interface SelectionStatementIf extends BaseNode {
  type: "SelectionStatementIf";
  cond: Expression;
  consequent: Statement;
  alternative: Statement | null;
}

export const isSelectionStatementIf = (
  i: BaseNode,
): i is SelectionStatementIf => i.type === "SelectionStatementIf";

export interface TypedSelectionStatementIf extends BaseNode {
  type: "SelectionStatementIf";
  cond: TypedExpression;
  consequent: TypedStatement;
  alternative: TypedStatement | null;
}

export const isTypedSelectionStatementIf = (
  i: TypedStatement,
): i is TypedSelectionStatementIf => i.type === "SelectionStatementIf";

export interface ExpressionStatement extends BaseNode {
  type: "ExpressionStatement";
  value: Expression | EmptyExpressionStatement;
}

export interface TypedExpressionStatement extends BaseNode {
  type: "ExpressionStatement";
  value: TypedExpression | EmptyExpressionStatement;
}

export interface EmptyExpressionStatement extends BaseNode {
  type: "EmptyExpressionStatement";
}

export const isEmptyExpressionStatement = (
  i: BaseNode,
): i is EmptyExpressionStatement => i.type === "EmptyExpressionStatement";

export type Expression = AssignmentExpression | CommaOperator;

export type TypedExpression = TypedExpressionBaseNode &
  (TypedAssignmentExpression | TypedCommaOperator);

export interface ExpressionTypeInfo {
  typeInfo: TypeInfo;
  lvalue: boolean;
}

export interface TypedExpressionBaseNode extends BaseNode, ExpressionTypeInfo {}

export interface CommaOperator extends BaseNode {
  type: "CommaOperator";
  value: AssignmentExpression[];
}

export const isCommaOperator = (i: BaseNode): i is CommaOperator =>
  i.type === "CommaOperator";

export interface TypedCommaOperator extends TypedExpressionBaseNode {
  type: "CommaOperator";
  value: TypedAssignmentExpression[];
}

export type AssignmentExpression =
  | ConditionalExpression
  | AssignmentExpressionNode;

export type TypedAssignmentExpression =
  | TypedConditionalExpression
  | TypedAssignmentExpressionNode;

export interface AssignmentExpressionNode extends BaseNode {
  type: "AssignmentExpression";
  op: AssignmentOperator;
  left: UnaryExpression;
  right: AssignmentExpression;
}

export const isAssignmentExpressionNode = (
  i: BaseNode,
): i is AssignmentExpressionNode => i.type === "AssignmentExpression";

export interface TypedAssignmentExpressionNode extends TypedExpressionBaseNode {
  type: "AssignmentExpression";
  op: AssignmentOperator;
  left: TypedUnaryExpression;
  right: TypedAssignmentExpression;
}

export type AssignmentOperator =
  | "="
  | "*="
  | "/="
  | "%="
  | "+="
  | "-="
  | "<<="
  | ">>="
  | "&="
  | "^="
  | "|=";

export type ConditionalExpression =
  | BinaryExpression
  | ConditionalExpressionNode;

export type TypedConditionalExpression =
  | TypedBinaryExpression
  | TypedConditionalExpressionNode;

export interface ConditionalExpressionNode extends BaseNode {
  type: "ConditionalExpression";
  cond: BinaryExpression;
  exprIfTrue: Expression;
  exprIfFalse: ConditionalExpression;
}

export const isConditionalExpressionNode = (
  i: BaseNode,
): i is ConditionalExpressionNode => i.type === "ConditionalExpression";

export interface TypedConditionalExpressionNode
  extends TypedExpressionBaseNode {
  type: "ConditionalExpression";
  cond: TypedBinaryExpression;
  exprIfTrue: TypedExpression;
  exprIfFalse: TypedConditionalExpression;
}

export type BinaryExpression = CastExpression | BinaryExpressionNode;

export type TypedBinaryExpression =
  | TypedCastExpression
  | TypedBinaryExpressionNode;

export interface BinaryExpressionNode extends BaseNode {
  type: "BinaryExpr";
  op: BinaryOperator;
  left: BinaryExpression;
  right: BinaryExpression;
}

export const isBinaryExpressionNode = (
  i: BaseNode,
): i is BinaryExpressionNode => i.type === "BinaryExpr";

export interface TypedBinaryExpressionNode extends TypedExpressionBaseNode {
  type: "BinaryExpr";
  op: BinaryOperator;
  left: TypedBinaryExpression;
  right: TypedBinaryExpression;
}

export type BinaryOperator =
  | "||"
  | "&&"
  | "|"
  | "^"
  | "&"
  | "=="
  | "!="
  | "<"
  | ">"
  | "<="
  | ">="
  | "<<"
  | ">>"
  | "+"
  | "-"
  | "*"
  | "/"
  | "%";

export type CastExpression = UnaryExpression | CastExpressionNode;

export type TypedCastExpression =
  | TypedUnaryExpression
  | TypedCastExpressionNode;

export interface CastExpressionNode extends BaseNode {
  type: "CastExpression";
  targetType: TypeName;
  expr: CastExpression;
}

export const isCastExpressionNode = (i: BaseNode): i is CastExpressionNode =>
  i.type === "CastExpression";

export interface TypedCastExpressionNode extends TypedExpressionBaseNode {
  type: "CastExpression";
  targetType: Void | ScalarType;
  expr: TypedCastExpression;
}

export interface TypeName {
  specifierQualifierList: TypeSpecifier[];
  abstractDeclarator: AbstractDeclarator;
}

export type UnaryExpression =
  | PostfixExpression
  | UnaryExpressionIncr
  | UnaryExpressionDecr
  | UnaryExpressionNode
  | UnaryExpressionSizeof;

export type TypedUnaryExpression =
  | TypedPostfixExpression
  | TypedUnaryExpressionIncr
  | TypedUnaryExpressionDecr
  | TypedUnaryExpressionNode
  | TypedUnaryExpressionSizeof;

export interface UnaryExpressionIncr extends BaseNode {
  type: "UnaryExpressionIncr";
  value: UnaryExpression;
}

export const isUnaryExpressionIncr = (i: BaseNode): i is UnaryExpressionIncr =>
  i.type === "UnaryExpressionIncr";

export interface TypedUnaryExpressionIncr extends TypedExpressionBaseNode {
  type: "UnaryExpressionIncr";
  value: TypedUnaryExpression;
}

export interface UnaryExpressionDecr extends BaseNode {
  type: "UnaryExpressionDecr";
  value: UnaryExpression;
}

export const isUnaryExpressionDecr = (i: BaseNode): i is UnaryExpressionDecr =>
  i.type === "UnaryExpressionDecr";

export interface TypedUnaryExpressionDecr extends TypedExpressionBaseNode {
  type: "UnaryExpressionDecr";
  value: TypedUnaryExpression;
}

export interface UnaryExpressionSizeof extends BaseNode {
  type: "UnaryExpressionSizeof";
  value: UnaryExpression | TypeName;
}

export const isTypeName = (i: UnaryExpression | TypeName): i is TypeName =>
  has(i, "specifierQualifierList");

export const isUnaryExpressionSizeof = (
  i: BaseNode,
): i is UnaryExpressionSizeof => i.type === "UnaryExpressionSizeof";

export interface TypedUnaryExpressionSizeof extends TypedExpressionBaseNode {
  type: "UnaryExpressionSizeof";
  value: number;
}

export interface UnaryExpressionNode extends BaseNode {
  type: "UnaryExpression";
  op: UnaryOperator;
  expr: CastExpression;
}

export const isUnaryExpressionNode = (i: BaseNode): i is UnaryExpressionNode =>
  i.type === "UnaryExpression";

export interface TypedUnaryExpressionNode extends TypedExpressionBaseNode {
  type: "UnaryExpression";
  op: UnaryOperator;
  expr: TypedCastExpression;
}

export const isTypedUnaryExpressionNode = (
  i: TypedExpression,
): i is TypedUnaryExpressionNode => i.type === "UnaryExpression";

export type UnaryOperator = "&" | "*" | "+" | "-" | "~" | "!";

export type PostfixExpression = PrimaryExpression | PostfixExpressionNode;

export type TypedPostfixExpression =
  | TypedPrimaryExpression
  | TypedPostfixExpressionNode;

export interface PostfixExpressionNode extends BaseNode {
  type: "PostfixExpression";
  expr: PrimaryExpression;
  ops: PostfixOp[];
}

export const isPostfixExpressionNode = (
  i: BaseNode,
): i is PostfixExpressionNode => i.type === "PostfixExpression";

export interface TypedPostfixExpressionNode extends TypedExpressionBaseNode {
  type: "PostfixExpression";
  expr: TypedPostfixExpression;
  op: TypedPostfixOp;
}

export const isTypedPostfixExpressionNode = (
  i: TypedExpression,
): i is TypedPostfixExpressionNode => i.type === "PostfixExpression";

export type PostfixOp =
  | ArraySubscriptingOp
  | FunctionCallOp
  | PointerMemberOp
  | StructMemberOp
  | PostfixIncrementOp
  | PostfixDecrementOp;

export type TypedPostfixOp =
  | TypedArraySubscriptingOp
  | TypedFunctionCallOp
  | TypedPointerMemberOp
  | TypedStructMemberOp
  | TypedPostfixIncrementOp
  | TypedPostfixDecrementOp;

export interface ArraySubscriptingOp extends BaseNode {
  type: "ArraySubscripting";
  value: Expression;
}

export interface TypedArraySubscriptingOp extends BaseNode {
  type: "ArraySubscripting";
  value: TypedExpression;
}

export const isTypedArraySubscriptingOp = (
  i: TypedPostfixOp,
): i is TypedArraySubscriptingOp => i.type === "ArraySubscripting";

export interface FunctionCallOp extends BaseNode {
  type: "FunctionCall";
  value: ArgumentExpressionList;
}

export interface TypedFunctionCallOp extends BaseNode {
  type: "FunctionCall";
  value: TypedArgumentExpressionList;
}

export type ArgumentExpressionList = AssignmentExpression[];

export type TypedArgumentExpressionList = TypedAssignmentExpression[];

export interface PointerMemberOp extends BaseNode {
  type: "PointerMember";
  value: Identifier;
}

export interface TypedPointerMemberOp extends BaseNode {
  type: "PointerMember";
  value: Identifier;
}

export const isTypedPointerMemberOp = (
  i: TypedPostfixOp,
): i is TypedPointerMemberOp => i.type === "PointerMember";

export interface StructMemberOp extends BaseNode {
  type: "StructMember";
  value: Identifier;
}

export interface TypedStructMemberOp extends BaseNode {
  type: "StructMember";
  value: Identifier;
}

export interface PostfixIncrementOp extends BaseNode {
  type: "PostfixIncrement";
}

export interface TypedPostfixIncrementOp extends BaseNode {
  type: "PostfixIncrement";
}

export interface PostfixDecrementOp extends BaseNode {
  type: "PostfixDecrement";
}

export interface TypedPostfixDecrementOp extends BaseNode {
  type: "PostfixDecrement";
}

export type PrimaryExpression =
  | PrimaryExprIdentifier
  | PrimaryExprConstant
  | PrimaryExprString
  | PrimaryExprParenthesis;

export type TypedPrimaryExpression =
  | TypedPrimaryExprIdentifier
  | TypedPrimaryExprConstant
  | TypedPrimaryExprString
  | TypedPrimaryExprParenthesis;

export interface PrimaryExprIdentifier extends BaseNode {
  type: "PrimaryExprIdentifier";
  value: Identifier;
}

export const isPrimaryExprIdentifier = (
  i: BaseNode,
): i is PrimaryExprIdentifier => i.type === "PrimaryExprIdentifier";

export interface TypedPrimaryExprIdentifier extends TypedExpressionBaseNode {
  type: "PrimaryExprIdentifier";
  value: Identifier;
  typeInfo: ObjectTypeInfo | FunctionType;
}

export interface PrimaryExprConstant extends BaseNode {
  type: "PrimaryExprConstant";
  value: Constant;
}

export const isPrimaryExprConstant = (i: BaseNode): i is PrimaryExprConstant =>
  i.type === "PrimaryExprConstant";

export interface TypedPrimaryExprConstant extends TypedExpressionBaseNode {
  type: "PrimaryExprConstant";
  value: TypedConstant;
}

export const isTypedPrimaryExprConstant = (
  expr: TypedExpression,
): expr is TypedPrimaryExprConstant => expr.type === "PrimaryExprConstant";

export const TYPED_CONSTANT_ONE: TypedPrimaryExprConstant = {
  type: "PrimaryExprConstant",
  start: { offset: 0, line: 0, column: 0 },
  end: { offset: 1, line: 0, column: 1 },
  src: "1",
  typeInfo: int(),
  lvalue: false,
  value: {
    type: "IntegerConstant",
    start: { offset: 0, line: 0, column: 0 },
    end: { offset: 1, line: 0, column: 1 },
    src: "1",
    typeInfo: int(),
    lvalue: false,
    value: BigInt(1),
  },
};

export interface PrimaryExprString extends BaseNode {
  type: "PrimaryExprString";
  value: string[];
}

export const isPrimaryExprString = (i: BaseNode): i is PrimaryExprString =>
  i.type === "PrimaryExprString";

export interface TypedPrimaryExprString extends TypedExpressionBaseNode {
  type: "PrimaryExprString";
  value: string[];
}

export interface PrimaryExprParenthesis extends BaseNode {
  type: "PrimaryExprParenthesis";
  value: Expression;
}

export const isPrimaryExprParenthesis = (
  i: BaseNode,
): i is PrimaryExprParenthesis => i.type === "PrimaryExprParenthesis";

export interface TypedPrimaryExprParenthesis extends TypedExpressionBaseNode {
  type: "PrimaryExprParenthesis";
  value: TypedExpression;
}

export type Identifier = string;

export type Constant = IntegerConstant | CharacterConstant;

export type TypedConstant = TypedIntegerConstant | CharacterConstant;

export interface IntegerConstant extends BaseNode {
  type: "IntegerConstant";
  value: bigint;
  suffix: IntegerConstantSuffix;
  isDecimal: boolean;
}

export const isIntegerConstant = (i: Constant): i is IntegerConstant =>
  isObject(i);

export interface TypedIntegerConstant extends TypedExpressionBaseNode {
  type: "IntegerConstant";
  value: bigint;
  typeInfo: ScalarType;
}

export const isTypedIntegerConstant = (
  expr: TypedConstant,
): expr is TypedIntegerConstant => isObject(expr);

export interface IntegerConstantSuffix {
  unsigned?: true;
  long?: true;
  longLong?: true;
}

export type CharacterConstant = string;
