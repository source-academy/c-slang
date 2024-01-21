import { FloatDataType, IntegerDataType } from "~src/common/types";
import { PointerDataType } from "~src/parser/c-ast/dataTypes";
import { ExpressionPBase } from "~src/processor/c-ast/core";

export type ConstantP = IntegerConstantP | FloatConstantP;

export interface IntegerConstantP extends ExpressionPBase {
  type: "IntegerConstant";
  value: bigint; // needs to be big int to support all possible values
  dataType: IntegerDataType; // to be determined during processing stage. PARSER DOES NOT FILL THIS.
}

export interface FloatConstantP extends ExpressionPBase {
  type: "FloatConstant";
  value: number;
  dataType: FloatDataType;
}
