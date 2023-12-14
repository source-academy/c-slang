/**
 * Definitions for literal expressions.
 */

import { Expression } from "~src/c-ast/core";

// For now constants are only ints TODO: need to handle other type + do overflow underflow checks of nubmers later
export type Constant = IntegerConstant | CharacterConstant;

export interface IntegerConstant extends Expression {
  type: "IntegerConstant";
  variableType: "int";
  value: number;
}

export interface CharacterConstant extends Expression {
  type: "CharacterConstant";
  variableType: "char";
  value: number;
}
