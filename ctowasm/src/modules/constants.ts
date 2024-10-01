import { VoidDataType } from "~src/parser/c-ast/dataTypes";

export const voidDataType: VoidDataType = {
  type: "void",
};

// Foreign Object Block Address (F.0.B.A) : 240 186
export const FOREIGN_OBJ_IDENTIFIER= 0xF0BA;

// Key to store the address of foreign objects in the object itself
export const SOURCE_C_IDENTIFIER_KEY = "_sourceCIdentifier";

export const NULL_PTR_ADR = 0;