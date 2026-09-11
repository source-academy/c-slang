import {
  ExpressionTypeInfo,
  TranslationUnit,
  TypeSpecifier,
  isStorageClassSpecifier,
  isStructSpecifier,
  isTypeSpecifier,
  isTypedIntegerConstant,
} from "./../ast/types";
import {
  Declarator,
  DeclaratorPart,
  Identifier,
  IdentifierDeclaratorPart,
  TypedExpression,
  isIdentifierDeclaratorPart,
  isTypedPrimaryExprConstant,
} from "../ast/types";
import {
  constructStructFromSpecifier,
  getTypeInfoFromSpecifiers,
} from "./specifiers";
import {
  ObjectTypeInfo,
  Structure,
  TypeInfo,
  array,
  functionType,
  isArithmeticType,
  isArray,
  isBool,
  isFunctionTypeInfo,
  isIncompleteTypeInfo,
  isObjectTypeInfo,
  isPointer,
  isStructure,
  isVoid,
  pointer,
} from "./types";
import { TypeEnv } from "./env";
import { TypeCheckingError } from "./errors";
import { getErrorMessage } from "../utils";

export const getIdentifierFromDeclarator = (
  d: Declarator,
): Identifier | null => {
  let id: Identifier | null = null;
  for (const p of d) {
    if (isIdentifierDeclaratorPart(p)) {
      if (id) throw "declarator declares multiple identifier";
      id = p.name;
    }
  }
  return id;
};

type DeclaratorWithoutIdentifier = Exclude<
  DeclaratorPart,
  IdentifierDeclaratorPart
>[];

export const constructDerivedTypes = (
  ls: DeclaratorWithoutIdentifier,
  baseType: TypeInfo,
  env: TypeEnv | null,
  allowEmptyStructSpecifier: boolean = false,
): TypeInfo => {
  const p = ls.pop();
  if (!p) return baseType;
  let t = baseType;

  switch (p.partType) {
    case "array": {
      if (isIncompleteTypeInfo(baseType))
        throw "cannot construct array from incomplete type";
      if (isFunctionTypeInfo(baseType))
        throw "cannot construct array from function type";
      if (p.length.value <= 0)
        throw "array size must be a positive integer constant";
      t = array(baseType, Number(p.length.value));
      break;
    }
    case "function": {
      // (6.7.5.3.1) A function declarator shall not specify a return type that is a function type or an array type
      if (isFunctionTypeInfo(baseType))
        throw "cannot return function type from function";
      if (isArray(baseType)) throw "cannot return array type from function";
      const paramTypeInfo = p.argTypes.map((i) => {
        const storageClassSpecifiers = i.specifiers.filter(
          isStorageClassSpecifier,
        );
        if (storageClassSpecifiers.length > 0)
          throw "typedef in parameter declaration";
        const typeSpecifiers = i.specifiers.filter(isTypeSpecifier);
        return constructType(
          typeSpecifiers,
          i.declarator,
          env,
          allowEmptyStructSpecifier,
        );
      });
      t = functionType(baseType, paramTypeInfo);
      break;
    }
    case "ptr": {
      t = pointer(baseType);
      break;
    }
  }

  return constructDerivedTypes(ls, t, env, allowEmptyStructSpecifier);
};

export const constructType = (
  specifiers: TypeSpecifier[],
  declarator: Declarator,
  env: TypeEnv | null,
  allowEmptyStructSpecifier: boolean = false,
): { identifier: Identifier | null; type: TypeInfo } => {
  const specifiedType = getTypeInfoFromSpecifiers(
    specifiers,
    env,
    allowEmptyStructSpecifier,
  );
  const identifier = getIdentifierFromDeclarator(declarator);
  const type = constructDerivedTypes(
    declarator.filter(
      (i) => !isIdentifierDeclaratorPart(i),
    ) as DeclaratorWithoutIdentifier,
    specifiedType,
    env,
    allowEmptyStructSpecifier,
  );
  return { identifier, type };
};

// (6.3.2.1) An lvalue is an expression with an object type or an incomplete type other than void
export const isLvalue = (t: ExpressionTypeInfo): boolean => {
  return (
    (isObjectTypeInfo(t.typeInfo) || isIncompleteTypeInfo(t.typeInfo)) &&
    !isVoid(t.typeInfo) &&
    t.lvalue
  );
};

// (6.3.2.1) A modifiable lvalue is an lvalue that does not have array type, does not have an incomplete type, ...
export const isModifiableLvalue = (t: ExpressionTypeInfo): boolean => {
  return (
    isLvalue(t) && !isArray(t.typeInfo) && !isIncompleteTypeInfo(t.typeInfo)
  );
};

export const isNullPtrConst = (expr: TypedExpression): boolean => {
  return (
    isTypedPrimaryExprConstant(expr) &&
    isTypedIntegerConstant(expr.value) &&
    expr.value.value === BigInt(0)
  );
};

export const checkSimpleAssignmentConstraint = (
  leftType: TypeInfo,
  rightType: TypeInfo,
  rightIsNullPtrConstant: boolean,
): boolean => {
  if (isArithmeticType(leftType) && isArithmeticType(rightType)) return true;
  if (isStructure(leftType) && leftType.isCompatible(rightType)) return true;
  if (
    isPointer(leftType) &&
    isPointer(rightType) &&
    leftType.referencedType.isCompatible(rightType.referencedType)
  )
    return true;
  if (isPointer(leftType) && rightIsNullPtrConstant) return true;
  if (isBool(leftType) && isPointer(rightType)) return true;
  if (
    checkPtrToVoidAssignment(leftType, rightType) ||
    checkPtrToVoidAssignment(rightType, leftType)
  )
    return true;
  return false;
};

// simple assignment constraint check: one is a pointer to an object/incomplete type and the other is ptr to void
export const checkPtrToVoidAssignment = (
  t1: TypeInfo,
  t2: TypeInfo,
): boolean => {
  if (!isPointer(t1) || !isPointer(t2)) return false;
  const r1 = t1.referencedType;
  const r2 = t2.referencedType;
  return (isObjectTypeInfo(r1) || isIncompleteTypeInfo(r1)) && isVoid(r2);
};

export const getMemberTypeInfo = (
  t: Structure,
  identifier: Identifier,
): ObjectTypeInfo => {
  for (const m of t.members) {
    if (m.name === identifier) {
      return m.type;
    }
  }
  throw (
    "member " +
    identifier +
    " does not exist on struct" +
    (t.tag ? " " + t.tag : "")
  );
};

export const getMember = (
  t: Structure,
  identifier: Identifier,
): [number, number, ObjectTypeInfo] => {
  let i = 0;
  for (const m of t.members) {
    if (m.name === identifier) {
      return [i, m.relativeAddress, m.type];
    }
    i++;
  }
  throw (
    "member " +
    identifier +
    " does not exist on struct" +
    (t.tag ? " " + t.tag : "")
  );
};

export const fillInForwardDeclarations = (
  t: TranslationUnit,
  env: TypeEnv,
): void => {
  t.value.map((i) =>
    i.specifiers.map((j) => {
      if (!(isTypeSpecifier(j) && isStructSpecifier(j))) return;
      try {
        constructStructFromSpecifier(j, env, true);
      } catch (err) {
        throw new TypeCheckingError(i, getErrorMessage(err));
      }
    }),
  );
};
