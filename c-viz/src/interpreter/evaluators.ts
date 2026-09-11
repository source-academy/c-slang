import {
  ObjectTypeInfo,
  ScalarType,
  TypeInfo,
  int,
  isArithmeticType,
  isArray,
  isIntegerType,
  isObjectTypeInfo,
  isPointer,
  isScalarType,
  isSigned,
  isStructure,
  isVoid,
  pointer,
  shortInt,
  unsignedInt,
} from "./../typing/types";
import {
  TypedCompoundStatement,
  TypedDeclaration as TypedDeclarationAST,
  TypedBinaryExpressionNode,
  TypedPrimaryExprConstant,
  TypedPostfixExpressionNode,
  TypedPrimaryExprParenthesis,
  TypedFunctionCallOp,
  TypedJumpStatementReturn,
  TypedConditionalExpressionNode,
  TypedFunctionDefinition as TypedFunctionDefinitionAST,
  TypedCommaOperator,
  TypedTranslationUnit,
  TypedASTNode,
  TypedInitDeclarator,
  TypedUnaryExpressionNode,
  TypedPrimaryExprIdentifier,
  TypedCastExpressionNode,
  TypedExpressionStatement,
  isTypedIntegerConstant,
  isTypedInitializerList,
  TypedInitializer,
  isTypedArrayDesignator,
  TypedAssignmentExpressionNode,
  TypedStructMemberOp,
  TypedPointerMemberOp,
  TypedArraySubscriptingOp,
  isTypedPointerMemberOp,
  isTypedArraySubscriptingOp,
  isTypedPostfixExpressionNode,
  isTypedUnaryExpressionNode,
  TypedUnaryExpressionSizeof,
  isEmptyExpressionStatement,
  TypedSelectionStatementIf,
  TypedIterationStatementDoWhile,
  TypedIterationStatementWhile,
  TypedIterationStatementFor,
  TYPED_CONSTANT_ONE,
} from "../ast/types";
import {
  ArithmeticConversionInstruction,
  ArraySubscriptInstruction,
  BinaryOpInstruction,
  BranchInstruction,
  CallInstruction,
  CastInstruction,
  ForInstruction,
  Instruction,
  InstructionType,
  PushInstruction,
  UnaryOpInstruction,
  WhileInstruction,
  arithmeticConversionInstruction,
  arraySubscriptInstruction,
  assignInstruction,
  binaryOpInstruction,
  branchInstruction,
  breakMarkInstruction,
  callInstruction,
  castInstruction,
  continueMarkInstruction,
  exitBlockInstruction,
  forInstruction,
  isBreakMarkInstruction,
  isContinueMarkInstruction,
  isExitBlockInstruction,
  isMarkInstruction,
  markInstruction,
  popInstruction,
  pushInstruction,
  returnInstruction,
  unaryOpInstruction,
  whileInstruction,
} from "./instructions";
import { Type, isFunction } from "../typing/types";
import { Runtime } from "./runtime";
import { FunctionDesignator, RuntimeObject, TemporaryObject } from "./object";
import { BIGINT_TO_BYTES, bytesToBigint } from "../typing/representation";
import { isTemporaryObject } from "./stash";
import {
  applyUsualArithmeticConversions,
  applyImplicitConversions as applyImplicitConversionsToExpression,
} from "../typing/conversions";
import { Endianness } from "../config";
import { RuntimeStack } from "./stack";
import { SHRT_SIZE } from "../constants";
import { checkSimpleAssignmentConstraint, getMember } from "../typing/utils";
import { NO_EFFECTIVE_TYPE } from "./effectiveTypeTable";
import { AgendaItem } from "./agenda";

export const ASTNodeEvaluator: {
  [NodeType in TypedASTNode["type"]]: (
    rt: Runtime,
    i: Extract<TypedASTNode, { type: NodeType }>,
    evaluateAsLvalue: boolean,
  ) => void;
} = {
  TranslationUnit: (
    rt: Runtime,
    { value: extDeclarations }: TypedTranslationUnit,
  ) => {
    for (const i of extDeclarations.reverse()) {
      rt.agenda.push(i);
    }
  },
  FunctionDefinition: (
    rt: Runtime,
    { identifier, typeInfo, body }: TypedFunctionDefinitionAST,
  ) => {
    const address = rt.allocateText(shortInt());
    const idx = rt.addFunction(identifier, body, typeInfo);
    rt.effectiveTypeTable.add(address, shortInt());
    rt.memory.setScalar(
      address,
      BigInt(idx),
      shortInt(),
      rt.config.endianness,
      true,
      true,
    );
    const fd = new FunctionDesignator(typeInfo, address, identifier);
    rt.textAndData.push(fd);
    rt.symbolTable.addAddress(identifier, address);
  },
  Declaration: (rt: Runtime, { declaratorList }: TypedDeclarationAST) => {
    if (declaratorList.length == 1) {
      return ASTNodeEvaluator["InitDeclarator"](rt, declaratorList[0], false);
    }
    for (let i = declaratorList.length - 1; i >= 0; i--) {
      rt.agenda.push(declaratorList[i]);
    }
  },
  TypedefDeclaration: () => {},
  InitDeclarator: (
    rt: Runtime,
    {
      identifier,
      typeInfo,
      initializer,
      qualifiedIdentifier,
    }: TypedInitDeclarator,
  ) => {
    let address: number;
    if (rt.symbolTable.inFileScope) {
      address = rt.allocateAndZeroData(typeInfo);
      const o = new RuntimeObject(typeInfo, address, identifier, rt.memory);
      o.initialized = true;
      rt.textAndData.push(o);
    } else {
      if (!qualifiedIdentifier)
        throw new Error("missing call to calculateStackFrame");
      const frame = rt.stack.peek();
      address = rt.stack.rbp + frame[qualifiedIdentifier].address;
    }

    rt.symbolTable.addAddress(identifier, address);
    rt.effectiveTypeTable.add(address, typeInfo);
    if (initializer) evaluateInitializer(initializer, address, typeInfo, rt);
  },
  InitializerList: () => {
    throw new Error("cannot evaluate initializer list on its own");
  },
  CompoundStatement: (
    rt: Runtime,
    { value: stmts }: TypedCompoundStatement,
  ) => {
    rt.symbolTable.enterBlock();
    rt.agenda.push(exitBlockInstruction());
    for (let i = stmts.length - 1; i >= 0; i--) {
      rt.agenda.push(stmts[i]);
    }
  },
  JumpStatementReturn: (
    rt: Runtime,
    { value: expr, expectedReturnType }: TypedJumpStatementReturn,
  ) => {
    rt.agenda.push(returnInstruction());
    if (expr) {
		if (!expr.typeInfo.isCompatible(expectedReturnType))
			// not possible to be void as expr is not null
			// not possible to be a struct that is not compatible as type check would fail
			rt.agenda.push(castInstruction(expectedReturnType as ScalarType));
		rt.agenda.push(expr);
	}
  },
  JumpStatementBreak: (rt: Runtime) => {
    jumpTill(rt, isBreakMarkInstruction);
  },
  JumpStatementContinue: (rt: Runtime) => {
    jumpTill(rt, isContinueMarkInstruction);
  },
  ExpressionStatement: (rt: Runtime, { value }: TypedExpressionStatement) => {
    if (isEmptyExpressionStatement(value)) return;
    if (!isVoid(value.typeInfo)) rt.agenda.push(popInstruction());
    rt.agenda.push(value);
  },
  EmptyExpressionStatement: () => {},
  CommaOperator: (rt: Runtime, { value: exprs }: TypedCommaOperator) => {
    for (let i = exprs.length - 1; i >= 0; i--) {
      if (i !== exprs.length - 1 && !isVoid(exprs[i].typeInfo))
        rt.agenda.push(popInstruction());
      rt.agenda.push(exprs[i]);
    }
  },
  CastExpression: (
    rt: Runtime,
    { expr, targetType }: TypedCastExpressionNode,
  ) => {
    rt.agenda.push(castInstruction(targetType));
    rt.agenda.push(expr);
  },
  AssignmentExpression: (
    rt: Runtime,
    { op, left, right }: TypedAssignmentExpressionNode,
  ) => {
    if (op !== "=") throw new Error("not implemented");
    if (!isObjectTypeInfo(left.typeInfo)) throw new Error("invalid LHS type");
    rt.agenda.push(assignInstruction());
    rt.agenda.push(right);
    rt.agenda.pushAsLvalue(left);
  },
  ConditionalExpression: (
    rt: Runtime,
    { cond, exprIfTrue, exprIfFalse, typeInfo }: TypedConditionalExpressionNode,
  ) => {
    if (isArithmeticType(typeInfo)) {
      if (
        !typeInfo.isCompatible(exprIfTrue.typeInfo) ||
        !typeInfo.isCompatible(exprIfFalse.typeInfo)
      )
        rt.agenda.push(arithmeticConversionInstruction(typeInfo));
    }
    rt.agenda.push(branchInstruction(exprIfTrue, exprIfFalse));
    rt.agenda.push(cond);
  },
  BinaryExpr: (rt: Runtime, { left, op, right }: TypedBinaryExpressionNode) => {
    rt.agenda.push(binaryOpInstruction(op));
    rt.agenda.push(right);
    rt.agenda.push(left);
  },
  UnaryExpressionIncr: () => {
    throw new Error("not implemented");
  },
  UnaryExpressionDecr: () => {
    throw new Error("not implemented");
  },
  UnaryExpressionSizeof: (
    rt: Runtime,
    { value }: TypedUnaryExpressionSizeof,
  ) => {
    rt.stash.pushWithoutConversions(
      new TemporaryObject(
        unsignedInt(),
        BIGINT_TO_BYTES[Type.UnsignedInt](BigInt(value), rt.config.endianness),
      ),
    );
  },
  UnaryExpression: (
    rt: Runtime,
    { expr, op }: TypedUnaryExpressionNode,
    evaluateAsLvalue: boolean,
  ) => {
    switch (op) {
      case "!": 
      case "+": 
      case "~": 
      case "-": {
        rt.agenda.push(unaryOpInstruction(op));
        rt.agenda.push(expr);
        break;
      }
      case "*": {
        if (evaluateAsLvalue) {
          rt.agenda.push(applyImplicitConversionsToExpression(expr));
        } else {
          rt.agenda.push(unaryOpInstruction(op));
          rt.agenda.push(expr);
        }
        break;
      }
      case "&": {
        if (
          isTypedPostfixExpressionNode(expr) &&
          isTypedArraySubscriptingOp(expr.op)
        ) {
          rt.agenda.pushAsLvalue(expr);
        } else if (isTypedUnaryExpressionNode(expr) && expr.op === "*") {
          rt.agenda.push(expr.expr);
        } else {
          rt.agenda.pushAsLvalue(expr);
        }
        break;
      }
      default:
        throw new Error("not implemented");
    }
  },
  PostfixExpression: (
    rt: Runtime,
    { expr, op }: TypedPostfixExpressionNode,
    evaluateAsLvalue: boolean,
  ) => {
    if (evaluateAsLvalue) {
      rt.agenda.pushAsLvalue(op);
      if (isTypedArraySubscriptingOp(op) || isTypedPointerMemberOp(op))
        rt.agenda.push(expr);
      else rt.agenda.pushAsLvalue(expr);
    } else {
      rt.agenda.push(op);
      rt.agenda.push(expr);
    }
  },
  ArraySubscripting: (
    rt: Runtime,
    { value: expr }: TypedArraySubscriptingOp,
    evaluateAsLvalue: boolean,
  ) => {
    rt.agenda.pushAsLvalue(arraySubscriptInstruction(evaluateAsLvalue));
    rt.agenda.push(expr);
  },
  FunctionCall: (rt: Runtime, { value: args }: TypedFunctionCallOp) => {
    rt.agenda.push(callInstruction(args.length));
    for (let i = args.length - 1; i >= 0; i--) {
      rt.agenda.push(args[i]);
    }
  },
  PointerMember: (
    rt: Runtime,
    { value: identifier }: TypedPointerMemberOp,
    evaluateAsLvalue: boolean,
  ) => {
    const o = rt.stash.pop();
    if (
      !(
        isTemporaryObject(o) &&
        isPointer(o.typeInfo) &&
        isStructure(o.typeInfo.referencedType)
      )
    )
      throw new Error("expected ptr to struct");

    const m = getMember(o.typeInfo.referencedType, identifier);
    const relAddr = m[1];
    const typeInfo = m[2];
    const addr = Number(
      bytesToBigint(o.bytes, isSigned(o.typeInfo), rt.config.endianness),
    );
    if (!evaluateAsLvalue) {
      const bytes = rt.memory.getObjectBytes(addr + relAddr, typeInfo);
      rt.stash.push(
        rt,
        new TemporaryObject(typeInfo, bytes, addr + relAddr),
        addr + relAddr,
      );
    } else {
      rt.stash.pushWithoutConversions(
        new TemporaryObject(
          pointer(applyImplicitConversions(typeInfo)),
          BIGINT_TO_BYTES[Type.Pointer](
            BigInt(addr + relAddr),
            rt.config.endianness,
          ),
        ),
      );
    }
  },
  StructMember: (
    rt: Runtime,
    { value: identifier }: TypedStructMemberOp,
    evaluateAsLvalue: boolean,
  ) => {
    const o = rt.stash.pop();
    if (!evaluateAsLvalue) {
      if (!(isTemporaryObject(o) && isStructure(o.typeInfo)))
        throw new Error("expected struct");
      const m = getMember(o.typeInfo, identifier);
      const relAddr = m[1];
      const typeInfo = m[2];
      if (isArray(typeInfo) && o.address === null)
        throw new Error("cannot take address of temporary object");
      rt.stash.push(
        rt,
        new TemporaryObject(
          typeInfo,
          o.bytes.slice(relAddr, relAddr + typeInfo.size),
          o.address === null ? null : o.address + relAddr,
        ),
        o.address === null ? null : o.address + relAddr,
      );
      return;
    }

    if (
      !(
        isTemporaryObject(o) &&
        isPointer(o.typeInfo) &&
        isStructure(o.typeInfo.referencedType)
      )
    )
      throw new Error("expected ptr to struct");
    const addr = bytesToBigint(
      o.bytes,
      isSigned(o.typeInfo),
      rt.config.endianness,
    );
    const m = getMember(o.typeInfo.referencedType, identifier);
    const relAddr = m[1];
    const typeInfo = m[2];
    rt.stash.pushWithoutConversions(
      new TemporaryObject(
        pointer(applyImplicitConversions(typeInfo)),
        BIGINT_TO_BYTES[Type.Pointer](
          addr + BigInt(relAddr),
          rt.config.endianness,
        ),
      ),
    );
  },
  PostfixIncrement: () => {
    throw new Error("not implemented");
  },
  PostfixDecrement: () => {
    throw new Error("not implemented");
  },
  PrimaryExprIdentifier: (
    rt: Runtime,
    { value: identifier, typeInfo }: TypedPrimaryExprIdentifier,
    evaluateAsLvalue: boolean,
  ) => {
    const address = rt.symbolTable.getAddress(identifier);
    if (evaluateAsLvalue) {
      rt.stash.pushWithoutConversions(
        new TemporaryObject(
          pointer(
            isFunction(typeInfo)
              ? typeInfo
              : applyImplicitConversions(typeInfo),
          ),
          BIGINT_TO_BYTES[Type.Pointer](BigInt(address), rt.config.endianness),
        ),
      );
      return;
    }

    let t: TemporaryObject | FunctionDesignator;
    if (isFunction(typeInfo)) {
      t = new FunctionDesignator(typeInfo, address, identifier);
    } else {
      const bytes = rt.memory.getObjectBytes(address, typeInfo);
      t = new TemporaryObject(typeInfo, bytes, address);
    }
    rt.stash.push(rt, t, address);
  },
  PrimaryExprConstant: (
    rt: Runtime,
    { value: v }: TypedPrimaryExprConstant,
  ) => {
    if (!isTypedIntegerConstant(v)) {
      const bytes = BIGINT_TO_BYTES[Type.Int](
        BigInt(v.charCodeAt(0)),
        rt.config.endianness,
      );
      const t = new TemporaryObject(int(), bytes);
      rt.stash.pushWithoutConversions(t);
      return;
    }
    const { typeInfo, value } = v;
    const bytes = BIGINT_TO_BYTES[typeInfo.type](value, rt.config.endianness);
    const t = new TemporaryObject(typeInfo, bytes);
    rt.stash.pushWithoutConversions(t);
  },
  PrimaryExprString: () => {
    throw new Error("not implemented");
  },
  PrimaryExprParenthesis: (
    rt: Runtime,
    { value: expr }: TypedPrimaryExprParenthesis,
    evaluateAsLvalue: boolean,
  ) => {
    if (evaluateAsLvalue) rt.agenda.pushAsLvalue(expr);
    else rt.agenda.push(expr);
  },
  SelectionStatementIf: (
    rt: Runtime,
    { cond, consequent, alternative }: TypedSelectionStatementIf,
  ) => {
    rt.agenda.push(branchInstruction(consequent, alternative));
    rt.agenda.push(cond);
  },
  IterationStatementDoWhile: (
    rt: Runtime,
    { cond, body }: TypedIterationStatementDoWhile,
  ) => {
    rt.agenda.push(breakMarkInstruction());
    rt.agenda.push(whileInstruction(cond, body));
    rt.agenda.push(cond);
    rt.agenda.push(continueMarkInstruction());
    rt.agenda.push(body);
  },
  IterationStatementWhile: (
    rt: Runtime,
    { cond, body }: TypedIterationStatementWhile,
  ) => {
    rt.agenda.push(breakMarkInstruction());
    rt.agenda.push(whileInstruction(cond, body));
    rt.agenda.push(cond);
  },
  IterationStatementFor: (
    rt: Runtime,
    { init, controlExpr, afterIterExpr, body }: TypedIterationStatementFor,
  ) => {
    rt.agenda.push(breakMarkInstruction());
    controlExpr = controlExpr === null ? TYPED_CONSTANT_ONE : controlExpr;
    rt.agenda.push(forInstruction(controlExpr, body, afterIterExpr));
    rt.agenda.push(controlExpr);
    if (init !== null) {
      rt.agenda.push(popInstruction());
      rt.agenda.push(init);
    }
  },
};

export const instructionEvaluator: {
  [InstrType in Instruction["type"]]: (
    rt: Runtime,
    i: Extract<Instruction, { type: InstrType }>,
  ) => void;
} = {
  [InstructionType.UNARY_OP]: (rt: Runtime, { op }: UnaryOpInstruction) => {
    const v = rt.stash.pop();
    switch (op) {
      case "+":
      case "-": {
        if (!(isTemporaryObject(v) && isIntegerType(v.typeInfo)))
          throw new Error("operand of unary +/- should be an integer value");
        let n = bytesToBigint(
          v.bytes,
          isSigned(v.typeInfo),
          rt.config.endianness,
        );
        if (op === "-") n = -n;
        rt.stash.pushWithoutConversions(
          new TemporaryObject(
            v.typeInfo,
            BIGINT_TO_BYTES[v.typeInfo.type](n, rt.config.endianness),
          ),
        );
        return;
      }
      case "!": {
        if (!(isTemporaryObject(v) && isScalarType(v.typeInfo)))
          throw new Error("operand of ! should be of scalar type");
        let n = bytesToBigint(
          v.bytes,
          isSigned(v.typeInfo),
          rt.config.endianness,
        );
        n = n === BigInt(0) ? BigInt(1) : BigInt(0);
        rt.stash.pushWithoutConversions(
          new TemporaryObject(
            v.typeInfo,
            BIGINT_TO_BYTES[v.typeInfo.type](n, rt.config.endianness),
          ),
        );
        return;
      }
      case "~": {
        throw new Error("not implemented");
      }
      case "*": {
        if (!(isTemporaryObject(v) && isPointer(v.typeInfo)))
          throw new Error("operand of * should have pointer type");
        const addr = Number(
          bytesToBigint(v.bytes, isSigned(v.typeInfo), rt.config.endianness),
        );
        const pt = v.typeInfo.referencedType;
        if (isObjectTypeInfo(pt)) {
          return rt.stash.push(
            rt,
            new TemporaryObject(pt, rt.memory.getObjectBytes(addr, pt), addr),
            addr,
          );
        }
        if (isFunction(pt)) {
          return rt.stash.push(
            rt,
            new FunctionDesignator(
              pt,
              addr,
              rt.symbolTable.getIdentifier(addr),
            ),
            addr,
          );
        }
        throw new Error("invalid dereference");
      }
      case "&": {
        throw new Error("invariant broken");
      }
    }
    throw new Error("not implemented");
  },
  [InstructionType.BINARY_OP]: (rt: Runtime, { op }: BinaryOpInstruction) => {
    const ro = rt.stash.pop();
    const lo = rt.stash.pop();
    if (!(isTemporaryObject(ro) && isTemporaryObject(lo)))
      throw new Error("expected objects for binary operation");
    const t1 = ro.typeInfo;
    const t0 = lo.typeInfo;

    switch (op) {
      case "+": {
        let res: TemporaryObject | undefined = undefined;

        if (isArithmeticType(t0) && isArithmeticType(t1)) {
          let l = bytesToBigint(lo.bytes, isSigned(t0), rt.config.endianness);
          let r = bytesToBigint(ro.bytes, isSigned(t1), rt.config.endianness);
          const ct = applyUsualArithmeticConversions(t0, t1);
          l = convertValue(l, ct, rt.config.endianness);
          r = convertValue(r, ct, rt.config.endianness);
          res = new TemporaryObject(
            ct,
            BIGINT_TO_BYTES[ct.type](l + r, rt.config.endianness),
          );
        }
        if (
          isPointer(t0) &&
          isObjectTypeInfo(t0.referencedType) &&
          isIntegerType(t1)
        ) {
          const iv = Number(
            bytesToBigint(ro.bytes, isSigned(t1), rt.config.endianness),
          );
          const pv = Number(
            bytesToBigint(lo.bytes, isSigned(t0), rt.config.endianness),
          );
          res = new TemporaryObject(
            t0,
            BIGINT_TO_BYTES[t0.type](
              BigInt(pv + iv * t0.referencedType.size),
              rt.config.endianness,
            ),
          );
        }
        if (
          isPointer(t1) &&
          isObjectTypeInfo(t1.referencedType) &&
          isIntegerType(t0)
        ) {
          const pv = Number(
            bytesToBigint(ro.bytes, isSigned(t1), rt.config.endianness),
          );
          const iv = Number(
            bytesToBigint(lo.bytes, isSigned(t0), rt.config.endianness),
          );
          res = new TemporaryObject(
            t1,
            BIGINT_TO_BYTES[t1.type](
              BigInt(pv + iv * t1.referencedType.size),
              rt.config.endianness,
            ),
          );
        }

        if (res === undefined) throw new Error("invalid types for +");
        rt.stash.pushWithoutConversions(res);
        return;
      }
      case "-": {
        let res: TemporaryObject | undefined = undefined;

        if (isArithmeticType(t0) && isArithmeticType(t1)) {
          let l = bytesToBigint(lo.bytes, isSigned(t0), rt.config.endianness);
          let r = bytesToBigint(ro.bytes, isSigned(t1), rt.config.endianness);
          const ct = applyUsualArithmeticConversions(t0, t1);
          l = convertValue(l, ct, rt.config.endianness);
          r = convertValue(r, ct, rt.config.endianness);
          res = new TemporaryObject(
            ct,
            BIGINT_TO_BYTES[ct.type](l - r, rt.config.endianness),
          );
        }
        if (
          isPointer(t0) &&
          isObjectTypeInfo(t0.referencedType) &&
          isIntegerType(t1)
        ) {
          const iv = Number(
            bytesToBigint(ro.bytes, isSigned(t1), rt.config.endianness),
          );
          const pv = Number(
            bytesToBigint(lo.bytes, isSigned(t0), rt.config.endianness),
          );
          res = new TemporaryObject(
            t0,
            BIGINT_TO_BYTES[t0.type](
              BigInt(pv - iv * t0.referencedType.size),
              rt.config.endianness,
            ),
          );
        }
        if (
          isPointer(t1) &&
          isObjectTypeInfo(t1.referencedType) &&
          isIntegerType(t0)
        ) {
          const pv = Number(
            bytesToBigint(ro.bytes, isSigned(t1), rt.config.endianness),
          );
          const iv = Number(
            bytesToBigint(lo.bytes, isSigned(t0), rt.config.endianness),
          );
          res = new TemporaryObject(
            t1,
            BIGINT_TO_BYTES[t1.type](
              BigInt(pv - iv * t1.referencedType.size),
              rt.config.endianness,
            ),
          );
        }

        if (res === undefined) throw new Error("invalid types for - (pointer - pointer not implemented yet)");
        rt.stash.pushWithoutConversions(res);
        return;
      }
      case "*":
      case "/":
      case "%": {
        if (!(isArithmeticType(t0) && isArithmeticType(t1)))
          throw new Error("expected arithmetic types for *, / or %");
        let l = bytesToBigint(lo.bytes, isSigned(t0), rt.config.endianness);
        let r = bytesToBigint(ro.bytes, isSigned(t1), rt.config.endianness);
        const ct = applyUsualArithmeticConversions(t0, t1);
        l = convertValue(l, ct, rt.config.endianness);
        r = convertValue(r, ct, rt.config.endianness);
        let res: bigint;
        switch (op) {
          case "*": {
            res = l * r;
            break;
          }
          case "/": {
            res = l / r;
            break;
          }
          case "%": {
            res = l % r;
            break;
          }
        }
        const bytes = BIGINT_TO_BYTES[ct.type](res, rt.config.endianness);
        const t = new TemporaryObject(ct, bytes);
        rt.stash.pushWithoutConversions(t);
        return;
      }
      case "==":
      case "!=": {
        let isTruthy: boolean | undefined = undefined;

        if (isArithmeticType(t0) && isArithmeticType(t1)) {
          let l = bytesToBigint(lo.bytes, isSigned(t0), rt.config.endianness);
          let r = bytesToBigint(ro.bytes, isSigned(t1), rt.config.endianness);
          const ct = applyUsualArithmeticConversions(t0, t1);
          l = convertValue(l, ct, rt.config.endianness);
          r = convertValue(r, ct, rt.config.endianness);
          switch (op) {
            case "==": {
              isTruthy = l == r;
              break;
            }
            case "!=": {
              isTruthy = l != r;
              break;
            }
          }
        }

        if (isScalarType(t0) && isScalarType(t1)) { // TODO: improve type checking here for this (supposed to be ptrs)
          const l = bytesToBigint(lo.bytes, isSigned(t0), rt.config.endianness);
          const r = bytesToBigint(ro.bytes, isSigned(t1), rt.config.endianness);
          switch (op) {
            case "==": {
              isTruthy = l == r;
              break;
            }
            case "!=": {
              isTruthy = l != r;
              break;
            }
          }
        }

        if (isTruthy === undefined)
          throw new Error("invalid types for ==, !=");
        const res = BIGINT_TO_BYTES[Type.Int](
          isTruthy ? BigInt(1) : BigInt(0),
          rt.config.endianness,
        );
        const t = new TemporaryObject(int(), res);
        rt.stash.pushWithoutConversions(t);
        return;
      }
      case "<":
      case ">":
      case "<=":
      case ">=": {
        let isTruthy: boolean | undefined = undefined;

        if (isArithmeticType(t0) && isArithmeticType(t1)) {
          let l = bytesToBigint(lo.bytes, isSigned(t0), rt.config.endianness);
          let r = bytesToBigint(ro.bytes, isSigned(t1), rt.config.endianness);
          const ct = applyUsualArithmeticConversions(t0, t1);
          l = convertValue(l, ct, rt.config.endianness);
          r = convertValue(r, ct, rt.config.endianness);
          switch (op) {
            case "<": {
              isTruthy = l < r;
              break;
            }
            case ">": {
              isTruthy = l > r;
              break;
            }
            case "<=": {
              isTruthy = l <= r;
              break;
            }
            case ">=": {
              isTruthy = l >= r;
              break;
            }
          }
        }

        if (isTruthy === undefined)
          throw new Error("invalid types for >, <, <= or >=");
        const res = BIGINT_TO_BYTES[Type.Int](
          isTruthy ? BigInt(1) : BigInt(0),
          rt.config.endianness,
        );
        const t = new TemporaryObject(int(), res);
        rt.stash.pushWithoutConversions(t);
        return;
      }
      case "<<":
      case ">>":
      case "^":
      case "&":
      case "|": {
        // apply usual arithmetic conversions
        throw new Error("bitwise binary operators not implemented");
      }
      case "&&": 
      case "||": {
        // TODO: implement short-circuit evaluation
        let isTruthy: boolean | undefined = undefined;

        if (isScalarType(t0) && isScalarType(t1)) {
          const l = bytesToBigint(lo.bytes, isSigned(t0), rt.config.endianness);
          const r = bytesToBigint(ro.bytes, isSigned(t1), rt.config.endianness);
          switch (op) {
            case "&&": {
              isTruthy = (l !== BigInt(0)) && (r !== BigInt(0));
              break;
            }
            case "||": {
              isTruthy = (l !== BigInt(0)) || (r !== BigInt(0));
              break;
            }
          }
        }

        if (isTruthy === undefined)
          throw new Error("invalid types for &&, ||");
        const res = BIGINT_TO_BYTES[Type.Int](
          isTruthy ? BigInt(1) : BigInt(0),
          rt.config.endianness,
        );
        const t = new TemporaryObject(int(), res);
        rt.stash.pushWithoutConversions(t);
        return;
      }
    }
    throw new Error("unknown binary operator");
  },
  [InstructionType.POP]: (rt: Runtime) => {
    rt.stash.pop();
  },
  [InstructionType.PUSH]: (rt: Runtime, { item }: PushInstruction) => {
    rt.stash.pushWithoutConversions(item);
  },
  [InstructionType.ASSIGN]: (rt: Runtime) => {
    const o = rt.stash.pop();
    if (!isTemporaryObject(o)) throw new Error("expected object for assign");

    const ptr = rt.stash.pop();
    if (
      !(
        isTemporaryObject(ptr) &&
        isPointer(ptr.typeInfo) &&
        isObjectTypeInfo(ptr.typeInfo.referencedType)
      )
    )
      throw new Error("expected ptr to object for assign");

    const address = Number(
      bytesToBigint(ptr.bytes, isSigned(ptr.typeInfo), rt.config.endianness),
    );
    const typeInfo = ptr.typeInfo.referencedType;

    if (
      checkSimpleAssignmentConstraint(
        typeInfo,
        o.typeInfo,
        isIntegerType(o.typeInfo) &&
          bytesToBigint(o.bytes, isSigned(o.typeInfo), rt.config.endianness) ===
            BigInt(0),
      )
    ) {
      if (isScalarType(typeInfo) && isScalarType(o.typeInfo)) {
        const n = bytesToBigint(
          o.bytes,
          isSigned(o.typeInfo),
          rt.config.endianness,
        );
        rt.memory.setScalar(address, n, typeInfo, rt.config.endianness);
        rt.initTable.add(address, typeInfo);
        rt.stash.pushWithoutConversions(
          new TemporaryObject(
            typeInfo,
            BIGINT_TO_BYTES[typeInfo.type](n, rt.config.endianness),
          ),
        );
        return;
      }
      if (isStructure(typeInfo) && isStructure(o.typeInfo)) {
        rt.memory.setObjectBytes(address, o.bytes, typeInfo);
        rt.initTable.add(address, typeInfo);
        rt.stash.pushWithoutConversions(o);
        return;
      }
    }

    throw new Error("unexpected types for assign");
  },
  [InstructionType.MARK]: (rt: Runtime) => {
    const idx = rt.functionCalls.peek();
    if (rt.getFunctions()[idx][0] !== "main") {
      throw new Error(
        "mark encountered without return (are you missing a return statement?)",
      );
    }
    // main implicitly returns 0 if no return statement
    rt.stash.pushWithoutConversions(
      new TemporaryObject(
        int(),
        BIGINT_TO_BYTES[Type.Int](BigInt(0), rt.config.endianness),
      ),
    );
    const block = rt.symbolTable.exitBlock();
    Object.values(block).forEach((addr) => rt.effectiveTypeTable.remove(addr));
    rt.stack.pop();
    rt.functionCalls.pop();
  },
  [InstructionType.EXIT]: (rt: Runtime) => {
    const o = rt.stash.pop();
    if (!(isTemporaryObject(o) && isIntegerType(o.typeInfo)))
      throw new Error("exit code should be integer type");
    const n = bytesToBigint(
      o.bytes,
      isSigned(o.typeInfo),
      rt.config.endianness,
    );
    rt.setExitCode(Number(n));
  },
  [InstructionType.CALL]: (rt: Runtime, { arity }: CallInstruction) => {
    const args = [];
    for (let i = 0; i < arity; i++) {
      args.push(rt.stash.pop());
    }
    args.reverse();

    const o = rt.stash.pop();
    if (
      !(
        isTemporaryObject(o) &&
        isPointer(o.typeInfo) &&
        isFunction(o.typeInfo.referencedType)
      )
    )
      throw new Error("expected ptr to function");

    const fnAddr = bytesToBigint(
      o.bytes,
      isSigned(o.typeInfo),
      rt.config.endianness,
    );
    const fnIdxBytes = rt.memory.getBytes(Number(fnAddr), SHRT_SIZE, true);
    const fnIdx = bytesToBigint(
      fnIdxBytes,
      isSigned(shortInt()),
      rt.config.endianness,
    );

    if (fnIdx < 0) {
      const builtinFn = rt.getBuiltinFunction(-Number(fnIdx) - 1);
      builtinFn.body(rt, args);
      return;
    }

    const [fnBody, fnType] = rt.getFunction(Number(fnIdx));
    rt.functionCalls.push(Number(fnIdx));
    rt.agenda.push(markInstruction());
    const stmts = fnBody.value;
    for (let i = stmts.length - 1; i >= 0; i--) {
      rt.agenda.push(stmts[i]);
    }

    const frame = RuntimeStack.calculateStackFrame(
      fnType.parameterTypes,
      fnBody,
    );

    rt.stack.push(frame);
    rt.symbolTable.enterBlock();

    for (let i = 0; i < arity; i++) {
      const { identifier, type: typeInfo } = fnType.parameterTypes[i];
      if (!identifier) throw new Error("parameter missing identifier");

      const address = rt.stack.rbp + frame[identifier].address;
      rt.symbolTable.addAddress(identifier, address);
      rt.effectiveTypeTable.add(address, typeInfo);

      rt.agenda.push(popInstruction());
      rt.agenda.push(assignInstruction());
      rt.agenda.push(pushInstruction(args[i]));
      rt.agenda.push(
        pushInstruction(
          new TemporaryObject(
            pointer(typeInfo),
            BIGINT_TO_BYTES[Type.Pointer](
              BigInt(address),
              rt.config.endianness,
            ),
          ),
        ),
      );
    }
  },
  [InstructionType.RETURN]: (rt: Runtime) => {
    jumpTill(rt, isMarkInstruction)
    const block = rt.symbolTable.exitBlock();
    Object.values(block).forEach((addr) => {
      const t = rt.effectiveTypeTable.get(addr);
      if (t !== NO_EFFECTIVE_TYPE) rt.initTable.remove(addr, t.size);
      rt.effectiveTypeTable.remove(addr);
    });
    rt.stack.pop();
    rt.functionCalls.pop();
  },
  [InstructionType.BRANCH]: (
    rt: Runtime,
    { exprIfTrue, exprIfFalse }: BranchInstruction,
  ) => {
    const o = rt.stash.pop();
    if (!(isTemporaryObject(o) && isScalarType(o.typeInfo)))
      throw new Error("condition should be of scalar type");
    const n = bytesToBigint(
      o.bytes,
      isSigned(o.typeInfo),
      rt.config.endianness,
    );
    if (n === BigInt(0)) {
      if (exprIfFalse !== null) rt.agenda.push(exprIfFalse);
    } else {
      rt.agenda.push(exprIfTrue);
    }
  },
  [InstructionType.WHILE]: (rt: Runtime, { cond, body }: WhileInstruction) => {
    const o = rt.stash.pop();
    if (!(isTemporaryObject(o) && isScalarType(o.typeInfo)))
      throw new Error("condition should be of scalar type");
    const n = bytesToBigint(
      o.bytes,
      isSigned(o.typeInfo),
      rt.config.endianness,
    );
    if (n !== BigInt(0)) {
      rt.agenda.push(whileInstruction(cond, body));
      rt.agenda.push(cond);
      rt.agenda.push(continueMarkInstruction());
      rt.agenda.push(body);
    }
  },
  [InstructionType.FOR]: (
    rt: Runtime,
    { cond, body, afterIter }: ForInstruction,
  ) => {
    const o = rt.stash.pop();
    if (!(isTemporaryObject(o) && isScalarType(o.typeInfo)))
      throw new Error("condition should be of scalar type");
    const n = bytesToBigint(
      o.bytes,
      isSigned(o.typeInfo),
      rt.config.endianness,
    );
    if (n !== BigInt(0)) {
      rt.agenda.push(forInstruction(cond, body, afterIter));
      rt.agenda.push(cond);
      if (afterIter) {
        rt.agenda.push(popInstruction())
        rt.agenda.push(afterIter);
      }
      rt.agenda.push(continueMarkInstruction());
      rt.agenda.push(body);
    }
  },
  [InstructionType.BREAK_MARK]: () => {},
  [InstructionType.CONTINUE_MARK]: () => {},
  [InstructionType.ARITHMETIC_CONVERSION]: (
    rt: Runtime,
    { typeInfo }: ArithmeticConversionInstruction,
  ) => {
    const o = rt.stash.pop();
    if (!(isTemporaryObject(o) && isArithmeticType(o.typeInfo)))
      throw "expected object of arithmetic type for conversion";
    const n = bytesToBigint(
      o.bytes,
      isSigned(o.typeInfo),
      rt.config.endianness,
    );
    const res = BIGINT_TO_BYTES[typeInfo.type](n, rt.config.endianness);
    const t = new TemporaryObject(typeInfo, res);
    rt.stash.pushWithoutConversions(t);
  },
  [InstructionType.CAST]: (rt: Runtime, { targetType }: CastInstruction) => {
    const o = rt.stash.pop();
    if (isVoid(targetType)) return;
    if (!(isTemporaryObject(o) && isScalarType(o.typeInfo)))
      throw new Error("expected scalar type");
    if (o.typeInfo.isCompatible(targetType)) return;
    const val = bytesToBigint(
      o.bytes,
      isSigned(o.typeInfo),
      rt.config.endianness,
    );

    let res: bigint | null = null;
    if (
      checkSimpleAssignmentConstraint(
        targetType,
        o.typeInfo,
        isIntegerType(o.typeInfo) && val === BigInt(0),
      )
    )
      res = val;
    if (isIntegerType(o.typeInfo) && isPointer(targetType)) res = val;
    if (isPointer(o.typeInfo) && isIntegerType(targetType)) res = val;
    if (
      isPointer(o.typeInfo) &&
      isObjectTypeInfo(o.typeInfo.referencedType) &&
      isPointer(targetType) &&
      isObjectTypeInfo(targetType.referencedType)
    )
      res = val;
    if (
      isPointer(o.typeInfo) &&
      isFunction(o.typeInfo.referencedType) &&
      isPointer(targetType) &&
      isFunction(targetType.referencedType)
    )
      res = val;

    if (res === null) throw new Error("invalid cast");
    const bytes = BIGINT_TO_BYTES[targetType.type](res, rt.config.endianness);
    const t = new TemporaryObject(targetType, bytes);
    rt.stash.pushWithoutConversions(t);
  },
  [InstructionType.ARRAY_SUBSCRIPT]: (
    rt: Runtime,
    { evaluateAsLvalue }: ArraySubscriptInstruction,
  ) => {
    let r = rt.stash.pop();
    let l = rt.stash.pop();
    if (!(isTemporaryObject(l) && isTemporaryObject(r)))
      throw new Error("expected 2 objects for array subscript");

    if (isPointer(r.typeInfo)) [l, r] = [r, l];
    if (
      !(
        isPointer(l.typeInfo) &&
        isObjectTypeInfo(l.typeInfo.referencedType) &&
        isIntegerType(r.typeInfo)
      )
    )
      throw new Error(
        "expected ptr to object and integer type for array subscript",
      );
    const offset = Number(
      bytesToBigint(r.bytes, isSigned(r.typeInfo), rt.config.endianness),
    );
    const addr = Number(
      bytesToBigint(l.bytes, isSigned(l.typeInfo), rt.config.endianness),
    );
    const newAddr = addr + offset * l.typeInfo.referencedType.size;
    if (!evaluateAsLvalue) {
      rt.stash.push(
        rt,
        new TemporaryObject(
          l.typeInfo.referencedType,
          rt.memory.getObjectBytes(newAddr, l.typeInfo.referencedType),
          newAddr,
        ),
        newAddr,
      );
    } else {
      rt.stash.pushWithoutConversions(
        new TemporaryObject(
          pointer(applyImplicitConversions(l.typeInfo.referencedType)),
          BIGINT_TO_BYTES[Type.Pointer](BigInt(newAddr), rt.config.endianness),
        ),
      );
    }
  },
  [InstructionType.EXIT_BLOCK]: (rt: Runtime) => {
    const block = rt.symbolTable.exitBlock();
    Object.values(block).forEach((addr) => {
      const t = rt.effectiveTypeTable.get(addr);
      if (t !== NO_EFFECTIVE_TYPE) rt.initTable.remove(addr, t.size);
      rt.effectiveTypeTable.remove(addr);
    });
  },
};

const convertValue = (
  i: bigint,
  t: ScalarType,
  e: Endianness = "little",
): bigint => {
  const bytes = BIGINT_TO_BYTES[t.type](i, e);
  return bytesToBigint(bytes, isSigned(t), e);
};

const evaluateInitializer = (
  t: TypedInitializer,
  address: number,
  tt: ObjectTypeInfo,
  rt: Runtime,
): void => {
  if (!isTypedInitializerList(t)) {
    rt.agenda.push(popInstruction());
    rt.agenda.push(assignInstruction());
    rt.agenda.push(t);
    rt.agenda.push(
      pushInstruction(
        new TemporaryObject(
          pointer(tt),
          BIGINT_TO_BYTES[Type.Pointer](BigInt(address), rt.config.endianness),
        ),
      ),
    );
    return;
  }
  if (isScalarType(tt)) {
    rt.agenda.push(popInstruction());
    rt.agenda.push(assignInstruction());
    rt.agenda.push(t.value[0].initializer);
    rt.agenda.push(
      pushInstruction(
        new TemporaryObject(
          pointer(tt),
          BIGINT_TO_BYTES[Type.Pointer](BigInt(address), rt.config.endianness),
        ),
      ),
    );
    return;
  }
  if (!(isStructure(tt) || isArray(tt)))
    throw new Error("invalid initialization");

  let i = 0;
  let currAddress = address;
  const updateCurrAddr = () => {
    currAddress = isArray(tt)
      ? address + i * tt.elementType.size
      : address + tt.members[i].relativeAddress;
  };
  t.value.forEach(({ designation, initializer }) => {
    let currType: ObjectTypeInfo = tt;

    if (designation.length) {
      let first = true;
      for (const d of designation) {
        if (isTypedArrayDesignator(d)) {
          if (!isArray(currType))
            throw "array designator when current object is not array";
          const idxVal = Number(d.idx.value);
          if (first) {
            i = idxVal;
            updateCurrAddr();
          } else {
            currAddress += i * currType.elementType.size;
          }
          currType = currType.elementType;
        } else {
          if (!isStructure(currType))
            throw "struct designator when current object is not struct";
          const [idx, relativeAddress, typeInfo] = getMember(
            currType,
            d.identifier,
          );
          if (first) {
            i = idx;
            updateCurrAddr();
          } else {
            currAddress += relativeAddress;
          }
          currType = typeInfo;
        }
        first = false;
      }
    } else {
      updateCurrAddr();
      currType = isArray(tt) ? tt.elementType : tt.members[i].type;
    }

    i++;
    evaluateInitializer(initializer, currAddress, currType, rt);
  });
};

const applyImplicitConversions = (t: TypeInfo): TypeInfo => {
  if (isArray(t)) {
    return pointer(t.elementType);
  }
  if (isFunction(t)) {
    return pointer(t);
  }
  return t;
};

const jumpTill = (rt: Runtime, pred: (i: AgendaItem) => boolean): void => {
    while (!pred(rt.agenda.peek())) {
      const t = rt.agenda.pop();
      if (isExitBlockInstruction(t)) instructionEvaluator[t.type](rt, t);
    }
    rt.agenda.pop();
}
