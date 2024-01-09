/**
 * Definitions for literal expressions.
 */

import { CNodeBase } from "~src/parser/c-ast/core";

type IntegerConstantSuffix = "u" | "l" | "ul"; // unsigned | long  NOTE: no need to handle ll since long long int are equivalent to long int in this implementation
type FloatConstantSuffix = "F" | "f"; // floating constants in C also have "L"/"l" suffix for long double constants. But long double and double are equivalent for this implementation.

export type Constant = IntegerConstant | FloatConstant;

export default Constant;

export interface IntegerConstant extends CNodeBase {
  type: "IntegerConstant";
  value: bigint; // needs to be big int to support all possible values
  suffix?: IntegerConstantSuffix;
}

export interface FloatConstant  extends CNodeBase{
  type: "FloatConstant";
  value: number;
  suffix?: FloatConstantSuffix;
}
