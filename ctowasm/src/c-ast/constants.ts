/**
 * Definitions for literal expressions.
 */

import { Expression } from "~src/c-ast/core";
import { FloatDataType, IntegerDataType } from "~src/common/types";

type IntegerConstantSuffix = "u" | "l" | "ul"; // unsigned | long  NOTE: no need to handle ll since long long int are equivalent to long int in this implementation
type FloatConstantSuffix = "F" | "f"; // floating constants in C also have "L"/"l" suffix for long double constants. But long double and double are equivalent for this implementation.

export type Constant = IntegerConstant | FloatConstant;

export interface IntegerConstant extends Expression {
  type: "IntegerConstant";
  value: bigint; // needs to be big int to support all possible values
  dataType: { type: "primary"; primaryDataType: IntegerDataType }; // to be determined during processing stage. PARSER DOES NOT FILL THIS.
  suffix?: IntegerConstantSuffix;
}

export interface FloatConstant extends Expression {
  type: "FloatConstant";
  value: number;
  dataType: { type: "primary"; primaryDataType: FloatDataType };
  suffix?: FloatConstantSuffix;
}
