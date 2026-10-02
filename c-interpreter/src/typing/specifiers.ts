import {
  EnumSpecifier,
  StructSpecifier,
  TypeSpecifier,
  isEnumSpecifier,
  isStorageClassSpecifier,
  isStructSpecifier,
  isTypeSpecifier,
} from "../ast/types";
import {
  CHAR_MAX,
  CHAR_MIN,
  INT_MAX,
  INT_MIN,
  LLONG_MAX,
  LLONG_MIN,
  LONG_MAX,
  LONG_MIN,
  SCHAR_MAX,
  SCHAR_MIN,
  SHRT_MAX,
  SHRT_MIN,
  UCHAR_MAX,
  UINT_MAX,
  ULLONG_MAX,
  ULONG_MAX,
  USHRT_MAX,
} from "../constants";
import { TypeEnv } from "./env";
import {
  IntegerType,
  Structure,
  TypeInfo,
  unsignedInt,
  Void,
  _bool,
  char,
  getTypeName,
  int,
  isObjectTypeInfo,
  longInt,
  longLongInt,
  shortInt,
  signedChar,
  structure,
  unsignedChar,
  unsignedLongInt,
  unsignedLongLongInt,
  unsignedShortInt,
  voidType,
} from "./types";
import { constructType } from "./utils";

export const TYPE_SPECIFIER_TO_TYPE_INFO: Record<string, IntegerType | Void> = {
  void: voidType(),

  char: char(),

  "signed char": signedChar(),

  "unsigned char": unsignedChar(),

  short: shortInt(),
  "signed short": shortInt(),
  "short int": shortInt(),
  "signed short int": shortInt(),

  "unsigned short": unsignedShortInt(),
  "unsigned short int": unsignedShortInt(),

  int: int(),
  signed: int(),
  "signed int": int(),

  unsigned: unsignedInt(),
  "unsigned int": unsignedInt(),

  long: longInt(),
  "signed long": longInt(),
  "long int": longInt(),
  "signed long int": longInt(),

  "unsigned long": unsignedLongInt(),
  "unsigned long int": unsignedLongInt(),

  "long long": longLongInt(),
  "signed long long": longLongInt(),
  "long long int": longLongInt(),
  "signed long long int": longLongInt(),

  "unsigned long long": unsignedLongLongInt(),
  "unsigned long long int": unsignedLongLongInt(),

  _Bool: _bool(),
};

export const TYPE_SPECIFIER_TO_NUMERICAL_LIMIT: Record<
  keyof typeof TYPE_SPECIFIER_TO_TYPE_INFO,
  [bigint, bigint]
> = {
  char: [CHAR_MIN, CHAR_MAX],

  "signed char": [SCHAR_MIN, SCHAR_MAX],

  "unsigned char": [BigInt(0), UCHAR_MAX],

  short: [SHRT_MIN, SHRT_MAX],
  "signed short": [SHRT_MIN, SHRT_MAX],
  "short int": [SHRT_MIN, SHRT_MAX],
  "signed short int": [SHRT_MIN, SHRT_MAX],

  "unsigned short": [BigInt(0), USHRT_MAX],
  "unsigned short int": [BigInt(0), USHRT_MAX],

  int: [INT_MIN, INT_MAX],
  signed: [INT_MIN, INT_MAX],
  "signed int": [INT_MIN, INT_MAX],

  unsigned: [BigInt(0), UINT_MAX],
  "unsigned int": [BigInt(0), UINT_MAX],

  long: [LONG_MIN, LONG_MAX],
  "signed long": [LONG_MIN, LONG_MAX],
  "long int": [LONG_MIN, LONG_MAX],
  "signed long int": [LONG_MIN, LONG_MAX],

  "unsigned long": [BigInt(0), ULONG_MAX],
  "unsigned long int": [BigInt(0), ULONG_MAX],

  "long long": [LLONG_MIN, LLONG_MAX],
  "signed long long": [LLONG_MIN, LLONG_MAX],
  "long long int": [LLONG_MIN, LLONG_MAX],
  "signed long long int": [LLONG_MIN, LLONG_MAX],

  "unsigned long long": [BigInt(0), ULLONG_MAX],
  "unsigned long long int": [BigInt(0), ULLONG_MAX],

  _Bool: [BigInt(0), BigInt(1)],
};

const unorderedCompare = (s1: string, s2: string): boolean =>
  s1.split(" ").sort().join(" ") === s2.split(" ").sort().join(" ");

export const getTypeInfoFromSpecifiers = (
  ls: TypeSpecifier[],
  env: TypeEnv | null = null,
  inForwardDeclarationScan: boolean = false,
): TypeInfo => {
  if (ls.length === 0) throw "at least one type specifier must be given";

  const n = ls.reduce((A, i) => (isStructSpecifier(i) ? A + 1 : A), 0);
  if (n > 1) throw "more than 1 struct specifier in specifier list";
  if (n === 1) {
    if (ls.length !== 1) throw "struct specifier should be the only specifier";
    return constructStructFromSpecifier(
      ls[0] as StructSpecifier,
      env,
      inForwardDeclarationScan,
    );
  }

  const enumCount = ls.reduce(
    (count, i) => (isEnumSpecifier(i) ? count + 1 : count),
    0,
  );
  if (enumCount > 0) {
    if (ls.length !== 1) throw "enum specifier should be the only specifier";
    return constructEnumFromSpecifier(
      ls[0] as EnumSpecifier,
      env,
      inForwardDeclarationScan,
    );
  }

  const s = ls.join(" ");
  for (const specifier in TYPE_SPECIFIER_TO_TYPE_INFO) {
    if (unorderedCompare(s, specifier)) {
      return TYPE_SPECIFIER_TO_TYPE_INFO[specifier];
    }
  }

  if (!env) throw "unknown type specifiers";
  if (ls.length > 1)
    throw "more than 1 typedef specified or unknown type specifiers";
  // pre typecheck, don't care about typedefs
  if (inForwardDeclarationScan) return int();
  return env.getIdentifierTypeInfo(ls[0] as string, true);
};

export const constructEnumFromSpecifier = (
  s: EnumSpecifier,
  env: TypeEnv | null,
  inForwardDeclarationScan: boolean,
): TypeInfo => {
  if (inForwardDeclarationScan) return int();
  if (!env) throw "enum specifier requires a type environment";
  if (s.enumeratorList === null) {
    if (s.identifier === null) throw "enum tag missing";
    return env.getEnumTagTypeInfo(s.identifier);
  }
  if (env.hasProcessedEnum(s)) return int();

  let value = BigInt(-1);
  for (const enumerator of s.enumeratorList) {
    value = enumerator.value ?? value + BigInt(1);
    if (value < INT_MIN || value > INT_MAX)
      throw "enumerator " + enumerator.name + " out of int range";
    env.addEnumerator(enumerator.name, value);
  }
  if (s.identifier !== null) env.addTagTypeInfo(s.identifier, int());
  env.markProcessedEnum(s);
  return int();
};

export const constructStructFromSpecifier = (
  s: StructSpecifier,
  env: TypeEnv | null,
  inForwardDeclarationScan: boolean,
): Structure => {
  const tag = s.identifier || undefined;
  const members = [];

  for (const d of s.declarationList) {
    for (const id of d.declaratorList) {
      const storageClassSpecifiers = d.specifiers.filter(
        isStorageClassSpecifier,
      );
      if (storageClassSpecifiers.length > 0)
        throw "typedef in struct definition";
      const typeSpecifiers = d.specifiers.filter(isTypeSpecifier);
      const { identifier: name, type } = constructType(
        typeSpecifiers,
        id.declarator,
        env,
        inForwardDeclarationScan,
      );
      if (!isObjectTypeInfo(type)) throw "non object type declared in struct";
      if (name) members.push({ name, type });
      else members.push({ type });
    }
  }

  const res = structure(members, tag);
  if (tag) {
    let other: Structure | undefined;
    try {
      other = env?.getTagTypeInfo(tag);
    } catch (e) {
      other = undefined;
    }
    if (s.declarationList.length === 0) {
      if (!other) {
        if (inForwardDeclarationScan) return res;
        throw "empty struct specifier";
      }
      return other;
    }
    if (other) {
      if (!res.isCompatible(other)) {
        if (inForwardDeclarationScan) {
          // first scan
          throw "redefinition of struct " + tag;
        } else {
          // second scan: other must be forward declaration
          for (let i = 0; i < members.length; i++) {
            other.members[i] = res.members[i];
          }
          return other;
        }
      }
    } else {
      env?.addTagTypeInfo(tag, res);
    }
  } else {
    if (s.declarationList.length === 0) {
      if (inForwardDeclarationScan) return res;
      throw "empty struct specifier";
    }
  }
  return res;
};

export const getNumericalLimitFromSpecifiers = (
  s: string,
): [bigint, bigint] => {
  for (const specifier in TYPE_SPECIFIER_TO_NUMERICAL_LIMIT) {
    if (unorderedCompare(s, specifier)) {
      return TYPE_SPECIFIER_TO_NUMERICAL_LIMIT[specifier];
    }
  }

  throw (
    "unknown type specifier " +
    s +
    ", expected one of " +
    JSON.stringify(Object.keys(TYPE_SPECIFIER_TO_NUMERICAL_LIMIT))
  );
};

export const typeInfoToSpecifier = (typeInfo: IntegerType | Void): string => {
  for (const [specifier, t] of Object.entries(TYPE_SPECIFIER_TO_TYPE_INFO)) {
    if (t.type === typeInfo.type) return specifier;
  }
  throw "type " + getTypeName(typeInfo) + " has no specifier";
};
