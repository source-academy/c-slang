import { ScalarCDataType } from "~src/common/types";
import { FunctionDataType } from "~src/parser/c-ast/dataTypes";
import { CNodePBase, ExpressionP, ExpressionPBase, StatementP } from "~src/processor/c-ast/core";
import { PrimaryDataTypeMemoryObjectDetails } from "~src/processor/dataTypeUtil";

/**
 * A processed function definition should include details on the size of locals and size of return.
 */
export interface FunctionDefinitionP extends CNodePBase {
  type: "FunctionDefinition";
  name: string;
  sizeOfLocals: number; // size of all the locals in bytes
  body: StatementP[];
  dataType: FunctionDataType; // data type of the function. only used for type check
}

/**
 * Only functions and function pointers may be called.
 * CallableP is a type refering to both of these.
 * TODO: add function pointers
 */
export type Callable = FunctionName;

export interface FunctionDetails {
  parameters: PrimaryDataTypeMemoryObjectDetails[] // the parameters of the function in terms of primary data types, as they would appear in memory (high to low address order)
  returnObjects: PrimaryDataTypeMemoryObjectDetails[] | null;
  sizeOfParams: number;
  sizeOfReturn: number;
}

/**
 * Helper type to indicate that a
 */
export interface FunctionName {
  type: "FunctionName";
  name: string;
  functionDetails: FunctionDetails
}

/**
 * Function calls are simply statements - i.e. they do not load any data type. The loading of the return object
 * of the function must be added after the function call.
 */
export interface FunctionCallP {
  type: "FunctionCall";
  calledFunction: Callable;
  args: ExpressionP[]; // the sequence of expressions which load up the function arguments
}