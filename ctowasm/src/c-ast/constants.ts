/**
 * Definitions for literal expressions.
 */

import { Expression } from "~src/c-ast/core";
import { VariableType } from "~src/common/types";

type ConstantSuffix = IntegerConstantSuffix;
type IntegerConstantSuffix = "u" | "l" | "ul"; // unsigned | long  NOTE: no need to handle ll since long long int are equivalent to long int in this implementation

export interface Constant extends Expression {
  type: "Constant";
  value: number;
  variableType: VariableType; // to be determined during processing stage. PARSER DOES NOT FILL THIS.
  suffix?: ConstantSuffix
}
