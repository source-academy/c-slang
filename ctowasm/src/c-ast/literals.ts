/**
 * Definitions for literal expressions.
 */

import { Expression } from "~src/c-ast/core";

// For now literals are only ints TODO: need to handle other type + do overflow underflow checks of nubmers later
export type Literal = Integer;

export interface Integer extends Expression {
  type: "Integer";
  variableType: "int";
  value: number;
}
