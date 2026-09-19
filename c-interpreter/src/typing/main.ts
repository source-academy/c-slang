import {
  BaseNode,
  CastExpressionNode,
  InitializerList,
  IterationStatement,
  IterationStatementDoWhile,
  IterationStatementFor,
  IterationStatementWhile,
  SelectionStatement,
  SelectionStatementIf,
  TypeSpecifier,
  TypedCastExpressionNode,
  TypedDesignator,
  TypedInitializerList,
  TypedIterationStatement,
  TypedIterationStatementDoWhile,
  TypedIterationStatementFor,
  TypedIterationStatementWhile,
  TypedSelectionStatement,
  TypedSelectionStatementIf,
  TypedUnaryExpressionDecr,
  TypedUnaryExpressionSizeof,
  Typedef,
  TypedefDeclaration,
  UnaryExpressionDecr,
  UnaryExpressionSizeof,
  isArrayDesignator,
  isCastExpressionNode,
  isInitializerList,
  isIntegerConstant,
  isIterationStatement,
  isIterationStatementDoWhile,
  isIterationStatementWhile,
  isJumpStatementReturn,
  isSelectionStatement,
  isStorageClassSpecifier,
  isTypeName,
  isTypeSpecifier,
  isTypedArraySubscriptingOp,
  isTypedIntegerConstant,
  isUnaryExpressionSizeof,
} from "./../ast/types";
import {
  PrimaryExprParenthesis,
  PrimaryExprString,
  TypedPrimaryExprParenthesis,
  AssignmentExpression,
  BinaryExpression,
  BlockItem,
  CastExpression,
  CommaOperator,
  CompoundStatement,
  ConditionalExpression,
  Declaration,
  Expression,
  ExpressionStatement,
  ExternalDeclaration,
  FunctionDefinition,
  InitDeclarator,
  Initializer,
  JumpStatement,
  JumpStatementReturn,
  PostfixExpression,
  PostfixExpressionNode,
  PrimaryExprConstant,
  PrimaryExprIdentifier,
  PrimaryExpression,
  Statement,
  TranslationUnit,
  TypedAssignmentExpression,
  TypedBinaryExpression,
  TypedBlockItem,
  TypedCastExpression,
  TypedCommaOperator,
  TypedCompoundStatement,
  TypedConditionalExpression,
  TypedDeclaration,
  TypedExpression,
  TypedExpressionStatement,
  TypedExternalDeclaration,
  TypedFunctionDefinition,
  TypedInitDeclarator,
  TypedInitializer,
  TypedJumpStatement,
  TypedJumpStatementReturn,
  TypedPostfixExpression,
  TypedPostfixExpressionNode,
  TypedPrimaryExprConstant,
  TypedPrimaryExprIdentifier,
  TypedPrimaryExpression,
  TypedStatement,
  TypedTranslationUnit,
  TypedUnaryExpression,
  TypedUnaryExpressionIncr,
  UnaryExpression,
  UnaryExpressionIncr,
  isAssignmentExpressionNode,
  isBinaryExpressionNode,
  isCommaOperator,
  isCompoundStatement,
  isConditionalExpressionNode,
  isDeclaration,
  isEmptyExpressionStatement,
  isFunctionDefinition,
  isJumpStatement,
  isPostfixExpressionNode,
  isPrimaryExprIdentifier,
  isUnaryExpressionDecr,
  isUnaryExpressionIncr,
  isUnaryExpressionNode,
  isPrimaryExprConstant,
  isPrimaryExprString,
  TypedConstant,
  IntegerConstant,
  TypedIntegerConstant,
  Constant,
  TypedPrimaryExprString,
  ExpressionTypeInfo,
  TypedPostfixOp,
  PostfixOp,
  UnaryExpressionNode,
  isTypedUnaryExpressionNode,
  TypedUnaryExpressionNode,
  isTypedPostfixExpressionNode,
} from "../ast/types";
import {
  applyImplicitConversions,
  applyIntegerPromotions,
  applyUsualArithmeticConversions,
} from "./conversions";
import { TypeEnv } from "./env";
import {
  getNumericalLimitFromSpecifiers,
  getTypeInfoFromSpecifiers,
} from "./specifiers";
import {
  FunctionReturnType,
  TypeInfo,
  array,
  char,
  int,
  isArithmeticType,
  isArray,
  isFunction,
  isIncompleteTypeInfo,
  isIntegerType,
  isObjectTypeInfo,
  isPointer,
  isScalarType,
  isStructure,
  isVoid,
  pointer,
  voidType,
  ScalarType,
  FunctionType,
  ObjectTypeInfo,
  Array,
  Structure,
  unsignedInt,
  Type,
} from "./types";
import {
  checkSimpleAssignmentConstraint,
  constructType,
  getMemberTypeInfo,
  getMember,
  isLvalue,
  isModifiableLvalue,
  isNullPtrConst,
  fillInForwardDeclarations,
} from "./utils";
import { getErrorMessage } from "../utils";
import { TypeCheckingError } from "./errors";

function typeCheck<T>(t: BaseNode, f: () => T): T {
  try {
    return f();
  } catch (err) {
    console.error(err);
    if (err instanceof TypeCheckingError) throw err;
    throw new TypeCheckingError(t, getErrorMessage(err));
  }
}

export const typeTranslationUnit = (t: TranslationUnit): TypedTranslationUnit =>
  typeCheck(t, () => {
    const res: TypedTranslationUnit = {
      ...t,
      value: [],
    };
    const env = new TypeEnv();

    // pre typechecking
    fillInForwardDeclarations(t, env);

    // typechecking
    for (const i of t.value) {
      res.value.push(typeExternalDeclaration(i, env));
    }

    // post typechecking
    env.aggTypes.forEach((i) => i.recalculateSizeAndAlignment());

    try {
      env.getIdentifierTypeInfo("main");
    } catch (err) {
      throw "translation unit must define a main function";
    }
    return res;
  });

const typeExternalDeclaration = (
  t: ExternalDeclaration,
  env: TypeEnv,
): TypedExternalDeclaration =>
  typeCheck(t, () => {
    if (isFunctionDefinition(t)) {
      return typeFunctionDefinition(t, env);
    }
    return typeDeclaration(t, env);
  });

const typeFunctionDefinition = (
  t: FunctionDefinition,
  env: TypeEnv,
): TypedFunctionDefinition =>
  typeCheck(t, () => {
    const storageClassSpecifiers = t.specifiers.filter(isStorageClassSpecifier);
    if (storageClassSpecifiers.length > 0)
      throw "function definition cannot include storage class specifiers";

    const typeSpecifiers = t.specifiers.filter(isTypeSpecifier);
    const { identifier, type: typeInfo } = constructType(
      typeSpecifiers,
      t.declarator,
      env,
    );

    if (!identifier) throw "function definition must contain an identifier";
    if (!isFunction(typeInfo)) throw "declarator does not have function type";
    env.addIdentifierTypeInfo(identifier, typeInfo);

    if (identifier === "main") {
      if (typeInfo.arity !== 0)
        throw "main function cannot take in any arguments (argc/argv not supported)";
      if (!typeInfo.returnType.isCompatible(int()))
        throw "main function must return type compatible wth int";
    }

    env.enterBlock();
    typeInfo.parameterTypes.forEach((i) => {
      if (!i.identifier)
        throw "declaration of parameter in function definition must contain an identifier";
      env.addIdentifierTypeInfo(i.identifier, i.type);
    });
    // to type check return statement
    env.addIdentifierTypeInfo("@returnType", typeInfo.returnType);
    const body = typeCompoundStatement(t.body, env);
    env.exitBlock();

    return { ...t, identifier, typeInfo, body };
  });

const typeDeclaration = (
  t: Declaration,
  env: TypeEnv,
): TypedDeclaration | TypedefDeclaration =>
  typeCheck(t, () => {
    const storageClassSpecifiers = t.specifiers.filter(isStorageClassSpecifier);
    const typeSpecifiers = t.specifiers.filter(isTypeSpecifier);
    // this is evaluated for side effects (declaring struct tags)
    getTypeInfoFromSpecifiers(typeSpecifiers, env);
    if (storageClassSpecifiers.length > 0) {
      if (storageClassSpecifiers.length > 1)
        throw "multiple typedef specifiers";
      return {
        ...t,
        type: "TypedefDeclaration",
        declaratorList: t.declaratorList.map((i) =>
          typeTypedef(i, env, typeSpecifiers),
        ),
      };
    }
    return {
      ...t,
      declaratorList: t.declaratorList.map((i) =>
        typeInitDeclarator(i, env, typeSpecifiers),
      ),
    };
  });

const typeTypedef = (
  t: InitDeclarator,
  env: TypeEnv,
  specifiers: TypeSpecifier[],
): Typedef =>
  typeCheck(t, () => {
    if (t.initializer) throw "cannot initialize typedef";
    const { identifier, type: typeInfo } = constructType(
      specifiers,
      t.declarator,
      env,
    );
    if (!identifier) throw "declarator must declare one identifier";
    env.addIdentifierTypeInfo(identifier, typeInfo, true);
    return {
      ...t,
      type: "Typedef",
      identifier,
      typeInfo,
    };
  });

const typeInitDeclarator = (
  t: InitDeclarator,
  env: TypeEnv,
  specifiers: TypeSpecifier[],
): TypedInitDeclarator =>
  typeCheck(t, () => {
    const { identifier, type: typeInfo } = constructType(
      specifiers,
      t.declarator,
      env,
    );
    if (!identifier) throw "declarator must declare one identifier";
    if (isFunction(typeInfo))
      throw "cannot declare function (forward declarations are not supported)";
    if (isVoid(typeInfo)) throw "cannot declare a variable of type void";

    let initializer: TypedInitializer | null = null;
    if (t.initializer) {
      if (!isObjectTypeInfo(typeInfo))
        throw "cannot initialize non object type";
      // TODO: if we are in file scope, need check that initializer is a constant expression
      // see (6.6) Constant expressions and (6.7.8) Initialization
      initializer = typeInitializer(t.initializer, env, typeInfo);
    }

    const res = {
      ...t,
      identifier,
      typeInfo: typeInfo as ObjectTypeInfo,
      initializer,
    };
    env.addIdentifierTypeInfo(identifier, typeInfo);
    return res;
  });

const typeInitializer = (
  t: Initializer,
  env: TypeEnv,
  targetType: ObjectTypeInfo,
): TypedInitializer =>
  typeCheck(t, () => {
    if (isScalarType(targetType)) {
      let e: AssignmentExpression;
      if (isInitializerList(t)) {
        const xs = t.value;
        if (xs.length !== 1) throw "invalid initializer type for scalar";
        if (xs[0].designation.length)
          throw "invalid initializer type for scalar";
        if (isInitializerList(xs[0].initializer))
          throw "invalid initializer type for scalar";
        e = xs[0].initializer;
      } else {
        e = t;
      }
      const res = typeAssignmentExpression(e, env);
      if (
        !checkSimpleAssignmentConstraint(
          targetType,
          res.typeInfo,
          isNullPtrConst(res),
        )
      )
        throw "invalid initializer type for scalar";
      return res;
    }

    if (isArray(targetType) || isStructure(targetType)) {
      if (!isInitializerList(t)) {
        const res = typeAssignmentExpression(t, env);
        if (!res.typeInfo.isCompatible(targetType))
          throw "invalid initializer type for aggregate type";
        return res;
      }
      return typeInitializerList(t, env, targetType);
    }

    throw "invalid initializer";
  });

const typeInitializerList = (
  t: InitializerList,
  env: TypeEnv,
  tt: Array | Structure,
): TypedInitializerList =>
  typeCheck(t, () => {
    let i = 0;
    const value = t.value.map(({ designation, initializer }) => {
      let curr: ObjectTypeInfo = tt;
      const typedDesignators: TypedDesignator[] = [];

      if (designation.length) {
        let first = true;
        for (const d of designation) {
          if (isArrayDesignator(d)) {
            if (!isArray(curr))
              throw "array designator when current object is not array";
            const idx = typeIntegerConstant(d.idx);
            const idxVal = Number(idx.value);
            if (!(0 <= idxVal && idxVal < curr.length))
              throw "index for array designator out of bounds";
            if (first) i = idxVal;
            curr = curr.elementType;
            typedDesignators.push({ ...d, idx, typeInfo: curr });
          } else {
            if (!isStructure(curr))
              throw "struct designator when current object is not struct";
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const [idx, _, typeInfo] = getMember(curr, d.identifier);
            if (first) i = idx;
            curr = typeInfo;
            typedDesignators.push({ ...d, typeInfo });
          }
          first = false;
        }
      } else {
        if (i >= (isArray(tt) ? tt.length : tt.members.length))
          throw "excess initializers in initializer list";
        curr = isArray(tt) ? tt.elementType : tt.members[i].type;
      }

      i++;
      return {
        designation: typedDesignators,
        initializer: typeInitializer(initializer, env, curr),
      };
    });
    return { ...t, value };
  });

const typeCompoundStatement = (
  t: CompoundStatement,
  env: TypeEnv,
): TypedCompoundStatement =>
  typeCheck(t, () => {
    // env.enterBlock should be called before this function is called
    // env.exitBlock should be called after this function returns
    return { ...t, value: t.value.map((i) => typeBlockItem(i, env)) };
  });

const typeBlockItem = (t: BlockItem, env: TypeEnv): TypedBlockItem =>
  typeCheck(t, () => {
    if (isDeclaration(t)) return typeDeclaration(t, env);
    return typeStatement(t, env);
  });

const typeStatement = (t: Statement, env: TypeEnv): TypedStatement =>
  typeCheck(t, () => {
    if (isCompoundStatement(t)) {
      env.enterBlock();
      const res = typeCompoundStatement(t, env);
      env.exitBlock();
      return res;
    }
    if (isJumpStatement(t)) return typeJumpStatement(t, env);
    if (isIterationStatement(t)) return typeIterationStatement(t, env);
    if (isSelectionStatement(t)) return typeSelectionStatement(t, env);
    return typeExpressionStatement(t, env);
  });

const typeJumpStatement = (
  t: JumpStatement,
  env: TypeEnv,
): TypedJumpStatement =>
  typeCheck(t, () => {
    if (isJumpStatementReturn(t)) return typeJumpStatementReturn(t, env);
    if (!env.inLoopBody) throw "break/continue outside of a loop body";
    return t;
  });

const typeJumpStatementReturn = (
  t: JumpStatementReturn,
  env: TypeEnv,
): TypedJumpStatementReturn =>
  typeCheck(t, () => {
    const expectedReturnType = env.getIdentifierTypeInfo(
      "@returnType",
    ) as FunctionReturnType;

    if (isVoid(expectedReturnType)) {
      if (t.value)
        throw "non-empty return statement in function declared with void return type";
      return { ...t, value: null, expectedReturnType };
    }

    if (!t.value)
      throw "empty return statement in function declared with non-void return type";

    const expr = typeExpression(t.value, env);
    if (
      !checkSimpleAssignmentConstraint(
        expectedReturnType,
        expr.typeInfo,
        isNullPtrConst(expr),
      )
    )
      throw "wrong return type";

    return { ...t, value: expr, expectedReturnType };
  });

const typeIterationStatement = (
  t: IterationStatement,
  env: TypeEnv,
): TypedIterationStatement =>
  typeCheck(t, () => {
    if (isIterationStatementWhile(t))
      return typeIterationStatementWhile(t, env);
    if (isIterationStatementDoWhile(t))
      return typeIterationStatementDoWhile(t, env);
    return typeIterationStatementFor(t, env);
  });

const typeIterationStatementWhile = (
  t: IterationStatementWhile,
  env: TypeEnv,
): TypedIterationStatementWhile =>
  typeCheck(t, () => {
    const cond = typeExpression(t.cond, env);
    if (!isScalarType(cond.typeInfo))
      throw "controlling expression of while statement should have scalar type";
    env.enterLoopBody();
    const body = typeStatement(t.body, env);
    env.exitLoopBody();
    return { ...t, cond, body };
  });

const typeIterationStatementDoWhile = (
  t: IterationStatementDoWhile,
  env: TypeEnv,
): TypedIterationStatementDoWhile =>
  typeCheck(t, () => {
    const cond = typeExpression(t.cond, env);
    if (!isScalarType(cond.typeInfo))
      throw "controlling expression of do while statement should have scalar type";
    env.enterLoopBody();
    const body = typeStatement(t.body, env);
    env.exitLoopBody();
    return { ...t, cond, body };
  });

const typeIterationStatementFor = (
  t: IterationStatementFor,
  env: TypeEnv,
): TypedIterationStatementFor =>
  typeCheck(t, () => {
    let init;
    if (t.init === null) init = null;
    else if (isDeclaration(t.init)) {
      throw "declaration in for statement not supported, consider moving it outside instead";
      // init = typeDeclaration(t.init, env);
      // if (isTypedefDeclaration(init))
      //   throw "typedef in declaration part of for statement";
    } else init = typeExpression(t.init, env);

    let controlExpr = null;
    if (t.controlExpr !== null) {
      controlExpr = typeExpression(t.controlExpr, env);
      if (!isScalarType(controlExpr.typeInfo))
        throw "controlling expression of for statement should have scalar type";
    }

    const afterIterExpr =
      t.afterIterExpr === null ? null : typeExpression(t.afterIterExpr, env);

    env.enterLoopBody();
    const body = typeStatement(t.body, env);
    env.exitLoopBody();

    return { ...t, init, controlExpr, afterIterExpr, body };
  });

const typeSelectionStatement = (
  t: SelectionStatement,
  env: TypeEnv,
): TypedSelectionStatement =>
  typeCheck(t, () => {
    return typeSelectionStatementIf(t, env);
  });

const typeSelectionStatementIf = (
  t: SelectionStatementIf,
  env: TypeEnv,
): TypedSelectionStatementIf =>
  typeCheck(t, () => {
    const cond = typeExpression(t.cond, env);
    if (!isScalarType(cond.typeInfo))
      throw "controlling expression of if statement should have scalar type";
    const consequent = typeStatement(t.consequent, env);
    const alternative =
      t.alternative === null ? null : typeStatement(t.alternative, env);
    return { ...t, cond, consequent, alternative };
  });

const typeExpressionStatement = (
  t: ExpressionStatement,
  env: TypeEnv,
): TypedExpressionStatement =>
  typeCheck(t, () => {
    let value;
    if (isEmptyExpressionStatement(t.value)) value = t.value;
    else value = typeExpression(t.value, env);
    return { ...t, value };
  });

const typeExpression = (t: Expression, env: TypeEnv): TypedExpression =>
  typeCheck(t, () => {
    if (isCommaOperator(t)) return typeCommaOperator(t, env);
    return typeAssignmentExpression(t, env);
  });

const typeCommaOperator = (
  t: CommaOperator,
  env: TypeEnv,
): TypedCommaOperator =>
  typeCheck(t, () => {
    const value = t.value.map((i) => typeAssignmentExpression(i, env));
    const last = value[value.length - 1];
    return {
      ...t,
      value,
      typeInfo: last.typeInfo,
      lvalue: false, // not lvalue in C, lvalue iff last is lvalue in C++
    };
  });

const typeAssignmentExpression = (
  t: AssignmentExpression,
  env: TypeEnv,
): TypedAssignmentExpression =>
  typeCheck(t, () => {
    if (!isAssignmentExpressionNode(t))
      return typeConditionalExpression(t, env);

    const left = typeUnaryExpression(t.left, env);
    if (!isModifiableLvalue(left))
      throw "require a modifiable lvalue as left operand in assignment";
    const leftType = applyImplicitConversions(left).typeInfo;
    const right = typeAssignmentExpression(t.right, env);
    const rightType = applyImplicitConversions(right).typeInfo;

    let ok = false;
    switch (t.op) {
      case "=": {
        if (
          checkSimpleAssignmentConstraint(
            leftType,
            rightType,
            isNullPtrConst(right),
          )
        )
          ok = true;
        break;
      }
      case "*=":
      case "/=": {
        if (isArithmeticType(leftType) && isArithmeticType(rightType))
          ok = true;
        break;
      }
      case "%=": {
        if (isIntegerType(leftType) && isIntegerType(rightType)) ok = true;
        break;
      }
      case "+=":
      case "-=": {
        if (
          isPointer(leftType) &&
          isObjectTypeInfo(leftType.referencedType) &&
          isIntegerType(rightType)
        )
          ok = true;
        if (isArithmeticType(leftType) && isArithmeticType(rightType))
          ok = true;
        break;
      }
      case "<<=":
      case ">>=":
      case "&=":
      case "^=":
      case "|=": {
        if (isIntegerType(leftType) && isIntegerType(rightType)) ok = true;
        break;
      }
    }

    if (!ok)
      throw "invalid assignment expression: left and right operand typing constraint violated";

    return {
      ...t,
      typeInfo: leftType,
      lvalue: false, // not lvalue in C, but lvalue in C++
      left,
      right,
    };
  });

const typeConditionalExpression = (
  t: ConditionalExpression,
  env: TypeEnv,
): TypedConditionalExpression =>
  typeCheck(t, () => {
    if (!isConditionalExpressionNode(t)) return typeBinaryExpression(t, env);

    const cond = typeBinaryExpression(t.cond, env);
    if (!isScalarType(cond.typeInfo)) throw "condition must be of scalar type";

    const exprIfTrue = typeExpression(t.exprIfTrue, env);
    const exprIfFalse = typeConditionalExpression(t.exprIfFalse, env);
    const t1 = exprIfTrue.typeInfo;
    const t2 = exprIfFalse.typeInfo;

    let resType: TypeInfo | undefined;
    if (isArithmeticType(t1) && isArithmeticType(t2))
      resType = applyUsualArithmeticConversions(t1, t2);
    if (isStructure(t1) && isStructure(t2) && t1.isCompatible(t2)) resType = t1;
    if (isVoid(t1) && isVoid(t2)) resType = voidType();
    if (
      isPointer(t1) &&
      isPointer(t2) &&
      t1.referencedType.isCompatible(t2.referencedType)
    )
      resType = t1;
    if (isPointer(t1) && isNullPtrConst(exprIfFalse)) resType = t1;
    if (isPointer(t2) && isNullPtrConst(exprIfTrue)) resType = t2;
    if (
      isPointer(t1) &&
      (isObjectTypeInfo(t1.referencedType) ||
        isIncompleteTypeInfo(t1.referencedType)) &&
      isPointer(t2) &&
      isVoid(t2.referencedType)
    )
      resType = t1;
    if (
      isPointer(t2) &&
      (isObjectTypeInfo(t2.referencedType) ||
        isIncompleteTypeInfo(t2.referencedType)) &&
      isPointer(t1) &&
      isVoid(t1.referencedType)
    )
      resType = t2;

    if (!resType) throw "invalid operand types in conditional expression";
    return {
      ...t,
      cond,
      exprIfTrue,
      exprIfFalse,
      lvalue: false,
      typeInfo: resType,
    };
  });

const typeBinaryExpression = (
  t: BinaryExpression,
  env: TypeEnv,
): TypedBinaryExpression =>
  typeCheck(t, () => {
    if (!isBinaryExpressionNode(t)) return typeCastExpression(t, env);

    const left = typeBinaryExpression(t.left, env);
    const right = typeBinaryExpression(t.right, env);
    let t0 = applyImplicitConversions(left).typeInfo;
    let t1 = applyImplicitConversions(right).typeInfo;
    let typeInfo: TypeInfo;

    switch (t.op) {
      case "||":
      case "&&": {
        if (!(isScalarType(t0) && isScalarType(t1)))
          throw "both operands of && or || should be of scalar type";
        typeInfo = int();
        break;
      }
      case "|":
      case "^":
      case "&": {
        if (!(isIntegerType(t0) && isIntegerType(t1)))
          throw "both operands of |, ^ or & should be of integral type";
        typeInfo = applyUsualArithmeticConversions(t0, t1);
        break;
      }
      case "==":
      case "!=": {
        let ok = false;
        if (isArithmeticType(t0) && isArithmeticType(t1)) ok = true;
        if (isPointer(t0) && isPointer(t1)) {
          const rt0 = t0.referencedType;
          const rt1 = t1.referencedType;
          if (rt0.isCompatible(rt1)) ok = true;
          if (
            (isObjectTypeInfo(rt0) || isIncompleteTypeInfo(rt0)) &&
            isVoid(rt1)
          )
            ok = true;
          if (
            (isObjectTypeInfo(rt1) || isIncompleteTypeInfo(rt1)) &&
            isVoid(rt0)
          )
            ok = true;
        }
        if (isPointer(t0) && isNullPtrConst(right)) ok = true;
        if (isPointer(t1) && isNullPtrConst(left)) ok = true;

        if (!ok) throw "typing constraints for == or != violated";
        typeInfo = int();
        break;
      }
      case "<":
      case ">":
      case "<=":
      case ">=": {
        let ok = false;
        if (isArithmeticType(t0) && isArithmeticType(t1)) ok = true;
        if (isPointer(t0) && isPointer(t1)) {
          const rt0 = t0.referencedType;
          const rt1 = t1.referencedType;
          if (
            isObjectTypeInfo(rt0) &&
            isObjectTypeInfo(rt1) &&
            rt0.isCompatible(rt1)
          )
            ok = true;
          if (
            isIncompleteTypeInfo(rt0) &&
            isIncompleteTypeInfo(rt1) &&
            rt0.isCompatible(rt1)
          )
            ok = true;
        }

        if (!ok) throw "typing constraints for <, >, <= or >= violated";
        typeInfo = int();
        break;
      }
      case "<<":
      case ">>": {
        if (!(isIntegerType(t0) && isIntegerType(t1)))
          throw "both operands of << or >> should be of integral type";
        t0 = applyIntegerPromotions(t0);
        t1 = applyIntegerPromotions(t1);
        typeInfo = left.typeInfo;
        break;
      }
      case "+": {
        let resType: TypeInfo | undefined;
        if (isArithmeticType(t0) && isArithmeticType(t1))
          resType = applyUsualArithmeticConversions(t0, t1);
        if (
          isPointer(t0) &&
          isObjectTypeInfo(t0.referencedType) &&
          isIntegerType(t1)
        )
          resType = t0;
        if (
          isPointer(t1) &&
          isObjectTypeInfo(t1.referencedType) &&
          isIntegerType(t0)
        )
          resType = t1;

        if (!resType) throw "typing constraints for + violated";
        typeInfo = resType;
        break;
      }
      case "-": {
        let resType: TypeInfo | undefined;
        if (isArithmeticType(t0) && isArithmeticType(t1))
          resType = applyUsualArithmeticConversions(t0, t1);
        if (
          isPointer(t0) &&
          isPointer(t1) &&
          t0.referencedType.isCompatible(t1.referencedType)
        )
          resType = t0;
        if (
          isPointer(t0) &&
          isObjectTypeInfo(t0.referencedType) &&
          isIntegerType(t1)
        )
          resType = t0;

        if (!resType) throw "typing constraints for - violated";
        typeInfo = resType;
        break;
      }
      case "*":
      case "/":
      case "%": {
        if (!(isArithmeticType(t0) && isArithmeticType(t1)))
          throw "both operands of *, / or % should be of arithmetic type";
        if (t.op === "%" && !(isIntegerType(t0) && isIntegerType(t1)))
          throw "both operands of % should be of integral type";
        typeInfo = applyUsualArithmeticConversions(t0, t1);
        break;
      }
      default:
        throw "invalid binary operator";
    }

    return {
      ...t,
      left,
      right,
      typeInfo,
      lvalue: false,
    };
  });

const typeCastExpression = (
  t: CastExpression,
  env: TypeEnv,
): TypedCastExpression =>
  typeCheck(t, () => {
    if (isCastExpressionNode(t)) return typeCastExpressionNode(t, env);
    return typeUnaryExpression(t, env);
  });

const typeCastExpressionNode = (
  t: CastExpressionNode,
  env: TypeEnv,
): TypedCastExpressionNode =>
  typeCheck(t, () => {
    const typeSpecifiers = t.targetType.specifierQualifierList;
    const declarator = t.targetType.abstractDeclarator;
    const { type: targetType } = constructType(typeSpecifiers, declarator, env);
    const expr = typeCastExpression(t.expr, env);
    if (
      !(
        isVoid(targetType) ||
        (isScalarType(targetType) && isScalarType(expr.typeInfo))
      )
    ) {
      throw "only cast to void or scalar type cast to scalar type allowed";
    }
    return {
      ...t,
      targetType,
      expr,
      typeInfo: targetType,
      lvalue: false,
    };
  });

const typeUnaryExpression = (
  t: UnaryExpression,
  env: TypeEnv,
): TypedUnaryExpression =>
  typeCheck(t, () => {
    if (isUnaryExpressionIncr(t)) return typeUnaryExpressionIncr(t, env);
    if (isUnaryExpressionDecr(t)) return typeUnaryExpressionDecr(t, env);
    if (isUnaryExpressionNode(t)) return typeUnaryExpressionNode(t, env);
    if (isUnaryExpressionSizeof(t)) return typeUnaryExpressionSizeof(t, env);
    return typePostfixExpression(t, env);
  });

const typeUnaryExpressionSizeof = (
  t: UnaryExpressionSizeof,
  env: TypeEnv,
): TypedUnaryExpressionSizeof =>
  typeCheck(t, () => {
    let value: number;
    if (isTypeName(t.value)) {
      const typeSpecifiers = t.value.specifierQualifierList;
      const declarator = t.value.abstractDeclarator;
      const { type } = constructType(typeSpecifiers, declarator, env);
      if (!isObjectTypeInfo(type)) throw "sizeof operator requires object type";
      value = type.size;
    } else {
      const tt = typeUnaryExpression(t.value, env);
      if (!isObjectTypeInfo(tt.typeInfo))
        throw "sizeof operator requires object type";
      value = tt.typeInfo.size;
    }
    return { ...t, value, typeInfo: unsignedInt(), lvalue: false };
  });

const typeUnaryExpressionIncr = (
  t: UnaryExpressionIncr,
  env: TypeEnv,
): TypedUnaryExpressionIncr =>
  typeCheck(t, () => {
    const value = typeUnaryExpression(t.value, env);
    if (
      !(
        isModifiableLvalue(value) &&
        (isArithmeticType(value.typeInfo) || isPointer(value.typeInfo))
      )
    )
      throw "prefix increment must be on a modifiable lvalue of arithmetic or pointer type";
    return { ...t, value, typeInfo: value.typeInfo, lvalue: true };
  });

const typeUnaryExpressionDecr = (
  t: UnaryExpressionDecr,
  env: TypeEnv,
): TypedUnaryExpressionDecr =>
  typeCheck(t, () => {
    const value = typeUnaryExpression(t.value, env);
    if (
      !(
        isModifiableLvalue(value) &&
        (isArithmeticType(value.typeInfo) || isPointer(value.typeInfo))
      )
    )
      throw "prefix decrement must be on a modifiable lvalue of arithmetic or pointer type";
    return { ...t, value, typeInfo: value.typeInfo, lvalue: true };
  });

const typeUnaryExpressionNode = (
  t: UnaryExpressionNode,
  env: TypeEnv,
): TypedUnaryExpressionNode =>
  typeCheck(t, () => {
    const expr = typeCastExpression(t.expr, env);
    const t0 = expr.typeInfo;
    let exprType: ExpressionTypeInfo;
    switch (t.op) {
      case "!": {
        if (!isScalarType(t0)) throw "operand of ! must be of scalar type";
        exprType = { typeInfo: int(), lvalue: false };
        break;
      }
      case "&": {
        let typeInfo: TypeInfo | undefined;
        if (isFunction(t0)) typeInfo = pointer(t0);
        if (isLvalue(expr)) typeInfo = pointer(t0);
        if (isTypedUnaryExpressionNode(expr) && expr.op === "*")
          typeInfo = expr.expr.typeInfo;
        if (
          isTypedPostfixExpressionNode(expr) &&
          isTypedArraySubscriptingOp(expr.op)
        )
          typeInfo = pointer(expr.typeInfo);

        if (!typeInfo) throw "& operator typing constraints violated";
        exprType = { typeInfo, lvalue: false };
        break;
      }
      case "*": {
        const p0 = applyImplicitConversions(expr).typeInfo;
        if (!isPointer(p0)) throw "operand of * must be of pointer type";
        const rt = p0.referencedType;
        exprType = { typeInfo: rt, lvalue: isObjectTypeInfo(rt) };
        break;
      }
      case "+":
      case "-": {
        if (!isArithmeticType(t0))
          throw "operand of + or - must be of arithmetic type";
        exprType = { typeInfo: applyIntegerPromotions(t0), lvalue: false };
        break;
      }
      case "~": {
        if (!isIntegerType(t0)) throw "operand of ~ must be of integeral type";
        exprType = { typeInfo: applyIntegerPromotions(t0), lvalue: false };
        break;
      }
      default:
        throw "invalid unary op";
    }
    return { ...t, expr, ...exprType };
  });

const typePostfixExpression = (
  t: PostfixExpression,
  env: TypeEnv,
): TypedPostfixExpression =>
  typeCheck(t, () => {
    if (isPostfixExpressionNode(t)) return typePostfixExpressionNode(t, env);
    return typePrimaryExpression(t, env);
  });

const typePostfixExpressionNode = (
  t: PostfixExpressionNode,
  env: TypeEnv,
): TypedPostfixExpressionNode =>
  typeCheck(t, () => {
    let expr: TypedPostfixExpression;
    let o: PostfixOp;
    if (t.ops.length > 1) {
      o = t.ops.pop() as PostfixOp;
      expr = typePostfixExpressionNode(t, env);
    } else {
      o = t.ops[0];
      expr = typePrimaryExpression(t.expr, env);
    }

    let op: TypedPostfixOp;
    let exprType: ExpressionTypeInfo;
    switch (o.type) {
      case "ArraySubscripting": {
        const value = typeExpression(o.value, env);
        const t1 = applyImplicitConversions(value).typeInfo;
        const t2 = applyImplicitConversions(expr).typeInfo;
        let typeInfo: TypeInfo | undefined;
        if (
          isPointer(t1) &&
          isObjectTypeInfo(t1.referencedType) &&
          isIntegerType(t2)
        )
          typeInfo = t1.referencedType;
        if (
          isPointer(t2) &&
          isObjectTypeInfo(t2.referencedType) &&
          isIntegerType(t1)
        )
          typeInfo = t2.referencedType;
        if (!typeInfo) throw "array subscripting typing constraints violated";
        op = { ...o, value };
        exprType = { typeInfo, lvalue: true };
        break;
      }
      case "FunctionCall": {
        const t0 = applyImplicitConversions(expr).typeInfo;
        if (!(isPointer(t0) && isFunction(t0.referencedType)))
          throw "expression should have type pointer to function";
        const ft = t0.referencedType;
        const rt = ft.returnType;
        if (!(isVoid(rt) || (isObjectTypeInfo(rt) && !isArray(rt))))
          throw "function should return void or object type other than an array type";

        const value = o.value.map((i) => typeAssignmentExpression(i, env));
        if (value.length !== ft.arity)
          throw "function call has wrong number of arguments";
        ft.parameterTypes.forEach((p, i) => {
          if (p.type.type === Type._Any) {
            if (!isObjectTypeInfo(value[i].typeInfo))
              throw "expected parameter to have object type";
            return;
          }
          if (
            !checkSimpleAssignmentConstraint(
              p.type,
              value[i].typeInfo,
              isNullPtrConst(value[i]),
            )
          )
            throw "mismatch in argument type";
        });

        op = {
          ...o,
          value,
        };
        exprType = {
          typeInfo: rt,
          lvalue: false,
        };
        break;
      }
      case "PointerMember": {
        if (!isPointer(expr.typeInfo))
          throw "arrow operator on non pointer to struct type";
        const rt = expr.typeInfo.referencedType;
        if (!isStructure(rt))
          throw "arrow operator on non pointer to struct type";
        const typeInfo = getMemberTypeInfo(rt, o.value);
        op = { ...o };
        exprType = { typeInfo, lvalue: true };
        break;
      }
      case "StructMember": {
        if (!isStructure(expr.typeInfo))
          throw "dot operator on non struct type";
        const typeInfo = getMemberTypeInfo(expr.typeInfo, o.value);
        op = { ...o };
        exprType = { typeInfo, lvalue: expr.lvalue };
        break;
      }
      case "PostfixDecrement":
      case "PostfixIncrement": {
        if (
          !(
            isModifiableLvalue(expr) &&
            (isArithmeticType(expr.typeInfo) || isPointer(expr.typeInfo))
          )
        )
          throw "postfix increment/decrement must be on a modifiable lvalue of arithmetic or pointer type";
        op = { ...o };
        exprType = { typeInfo: expr.typeInfo, lvalue: false };
        break;
      }
      default:
        throw "invalid postfix op";
    }

    return { ...t, expr, op, ...exprType };
  });

const typePrimaryExpression = (
  t: PrimaryExpression,
  env: TypeEnv,
): TypedPrimaryExpression =>
  typeCheck(t, () => {
    if (isPrimaryExprIdentifier(t)) return typePrimaryExprIdentifier(t, env);
    if (isPrimaryExprConstant(t)) return typePrimaryExprConstant(t);
    if (isPrimaryExprString(t)) return typePrimaryExprString(t);
    return typePrimaryExprParenthesis(t, env);
  });

const typePrimaryExprIdentifier = (
  t: PrimaryExprIdentifier,
  env: TypeEnv,
): TypedPrimaryExprIdentifier =>
  typeCheck(t, () => {
    const typeInfo = env.getIdentifierTypeInfo(t.value);
    return {
      ...t,
      typeInfo: typeInfo as ObjectTypeInfo | FunctionType,
      lvalue: !isFunction(typeInfo),
    };
  });

const typePrimaryExprConstant = (
  t: PrimaryExprConstant,
): TypedPrimaryExprConstant =>
  typeCheck(t, () => {
    const value = typeConstant(t.value);
    return {
      ...t,
      value,
      typeInfo: isTypedIntegerConstant(value) ? value.typeInfo : int(),
      lvalue: isTypedIntegerConstant(value) ? value.lvalue : false,
    };
  });

const typePrimaryExprString = (t: PrimaryExprString): TypedPrimaryExprString =>
  typeCheck(t, () => ({
    ...t,
    typeInfo: array(char(), t.value.length),
    lvalue: true,
  }));

const typePrimaryExprParenthesis = (
  t: PrimaryExprParenthesis,
  env: TypeEnv,
): TypedPrimaryExprParenthesis =>
  typeCheck(t, () => {
    const value = typeExpression(t.value, env);
    return {
      ...t,
      value,
      typeInfo: value.typeInfo,
      lvalue: value.lvalue,
    };
  });

const typeConstant = (t: Constant): TypedConstant => {
  if (isIntegerConstant(t)) return typeIntegerConstant(t);
  return t;
};

const typeIntegerConstant = (t: IntegerConstant): TypedIntegerConstant =>
  typeCheck(t, () => {
    let suffixMask = 0;
    if (t.suffix.unsigned) suffixMask |= 1 << 0;
    if (t.suffix.long) suffixMask |= 1 << 1;
    if (t.suffix.longLong) suffixMask |= 1 << 2;

    let typesToTry = [];
    switch (suffixMask) {
      case 0: {
        // no suffix
        if (t.isDecimal) typesToTry = ["int", "long int", "long long int"];
        else
          typesToTry = [
            "int",
            "unsigned int",
            "long int",
            "unsigned long int",
            "long long int",
            "unsigned long long int",
          ];
        break;
      }
      case 1: {
        // only unsigned
        if (t.isDecimal)
          typesToTry = [
            "unsigned int",
            "unsigned long int",
            "unsigned long long int",
          ];
        else
          typesToTry = [
            "unsigned int",
            "unsigned long int",
            "unsigned long long int",
          ];
        break;
      }
      case 2: {
        // only long
        if (t.isDecimal) typesToTry = ["long int", "long long int"];
        else
          typesToTry = [
            "long int",
            "unsigned long int",
            "long long int",
            "unsigned long long int",
          ];
        break;
      }
      case 3: {
        // only unsigned and long
        if (t.isDecimal)
          typesToTry = ["unsigned long int", "unsigned long long int"];
        else typesToTry = ["unsigned long int", "unsigned long long int"];
        break;
      }
      case 4: {
        // only long long
        if (t.isDecimal) typesToTry = ["long long int"];
        else typesToTry = ["long long int", "unsigned long long int"];
        break;
      }
      case 5: {
        // only unsigned and long long
        if (t.isDecimal) typesToTry = ["unsigned long long int"];
        else typesToTry = ["unsigned long long int"];
        break;
      }
      default:
        throw "invalid integer constant suffix";
    }

    let typeInfo: TypeInfo | undefined;
    for (const ti of typesToTry) {
      const [type_min, type_max] = getNumericalLimitFromSpecifiers(ti);
      if (type_min <= t.value && t.value <= type_max) {
        typeInfo = getTypeInfoFromSpecifiers(ti.split(" ") as TypeSpecifier[]);
        break;
      }
    }

    if (!typeInfo)
      throw (
        "integer constant " +
        t.src +
        " outside numerical limits of all candidate types " +
        JSON.stringify(typesToTry)
      );

    return {
      ...t,
      typeInfo: typeInfo as ScalarType,
      lvalue: false,
    };
  });
