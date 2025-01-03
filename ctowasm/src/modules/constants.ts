import { VoidDataType } from "~src/parser/c-ast/dataTypes";

export const voidDataType: VoidDataType = {
  type: "void",
};

// Key to store the address of foreign objects in the object itself
export const SOURCE_C_IDENTIFIER_KEY = "_sourceCIdentifier";

export const NULL_PTR_ADR = 0;