import { CNodePBase, ExpressionP, ExpressionPBase, StatementP } from "~src/processor/c-ast/core";
import { PrimaryDataTypeMemoryObjectDetails } from "~src/processor/dataTypeUtil";

/**
 * A processed function definition should include detailson the size of locals and size of return.
 */
export interface FunctionDefinitionP extends CNodePBase {
  type: "FunctionDefinition";
  params: PrimaryDataTypeMemoryObjectDetails[];
  returnMemoryDetails: PrimaryDataTypeMemoryObjectDetails[] | null; // The return of a function is broken up into multiple primary data types, as structs may be returned form functions
  sizeOfLocals: number; // size of all the locals in bytes
  sizeOfReturn: number; /// size of the return type
  sizeOfParams: number; // size of all the parameters in bytes
  body: StatementP[];
}

/**
 * Only functions and function pointers may be called.
 * CallableP is a type refering to both of these.
 * TODO: add function pointers
 */
export type CallableP = FunctionNameP;

/**
 * Helper type to indicate that a
 */
export interface FunctionNameP {
  type: "FunctionName";
  name: string;
}

/**
 * Function calls are simply statements - i.e. they do not load any data type. The loading of the return object
 * of the function must be added after the function call.
 */
export interface FunctionCallP {
  type: "FunctionCall";
  calledFunction: CallableP;
  args: ExpressionP[]; // the sequence of expressions which load up the function arguments
}

/**
 * Represents the call of an external function, which is on not defined inside the source program.
 * In this particular c to wasm compiler, these are functions imported into the wasm module, such as from the JS environment.
 * No memory store statements are generated for the return of such a function, it is assumed to be handled externally. 
 */
export interface ExternalFunctionCallP {
  type: "FunctionCall";
  functionName: string;
  args: ExpressionP[];
}
