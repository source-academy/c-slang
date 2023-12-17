/**
 * Definitions for literal expressions.
 */

import { Expression } from "~src/c-ast/core";
import { VariableType } from "~src/common/types";

export interface Constant extends Expression {
  type: "Constant";
  value: number;
  variableType: VariableType; // to be determined during processing stage. PARSER DOES NOT FILL THIS.
  isUnsigned?: boolean; // default should be undefined/false
}
