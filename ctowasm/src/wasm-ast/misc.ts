import { WasmType } from "~src/wasm-ast/types";
import { WasmAstNode, WasmExpression } from "~src/wasm-ast/core";

/**
 * Definitions of wasm AST nodes that do not fall under other categories.
 */
export interface WasmFunctionImport extends WasmAstNode {
  type: "FunctionImport";
  importPath: string[]; // the path to this imported function e.g. ["console", "log"]
  name: string; // name of this function within the wasm module. May not match the last index of import path!
  params: WasmType[];
  return: WasmType | null;
}

/**
 * Base class for nodes that are meant to wrap other expressions to perform some simple operation on the results of the wrapped expression.
 */
export interface WasmWrapperNode {
  expr: WasmExpression;
}

/**
 * Special wrapper node to handle converting an expression value to a "boolean" value (1 or 0).
 */
export interface WasmBooleanExpression extends WasmWrapperNode {
  type: "BooleanExpression";
  isNegated?: boolean;
}

type ExtendIntInstructions = "i64.extend_i32.u" | "i64.extend_i32_u";
type WrapIntInstructions = "i32.wrap_i64";
type PromoteFloatInstructions = "f64.promote_f32" | "f32.demote_f64";
type DemoteFloatInstructions = "f32.demote_f64";
type ConvertIntToFloatInstructions =
  | "f32.convert_i32_s"
  | "f32.convert_i32_u"
  | "f32.convert_i64_s"
  | "f32.convert_i64_u"
  | "f64.convert_i32_s"
  | "f64.convert_i32_u"
  | "f64.convert_i64_s"
  | "f64.convert_i64_u";
type TruncateFloatToIntInstructions =
  | "i32.trunc_f32_s"
  | "i32.trunc_f32_u"
  | "i32.trunc_f64_s"
  | "i32.trunc_f64_u"
  | "i64.trunc_f32_s"
  | "i64.trunc_f32_u"
  | "i64.trunc_f64_s"
  | "i64.trunc_f64_u";

type NumericConversionInstruction =
  | ExtendIntInstructions
  | WrapIntInstructions
  | PromoteFloatInstructions
  | DemoteFloatInstructions
  | ConvertIntToFloatInstructions
  | TruncateFloatToIntInstructions;

/**
 * Wrapper for wasm types that performs a operation on a numeric type, like extending/wrapping ints.
 */
export interface WasmNumericConversionWrapper extends WasmWrapperNode {
  type: "NumericWrapper";
  instruction: NumericConversionInstruction;
}
