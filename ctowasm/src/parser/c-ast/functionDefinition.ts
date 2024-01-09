import { CNodeBase } from "~src/parser/c-ast/core";
import { FunctionDataType } from "~src/parser/c-ast/dataTypes";
import Block from "~src/parser/c-ast/statement/compoundStatement";

export default interface FunctionDefinition extends CNodeBase {
  type: "FunctionDefinition";
  name: string;
  dataType: FunctionDataType; // contains returntype and parameter type details
  body: Block;
  parameterNames: string[]; // the names of the parameters of the function following the same order as parameter types inside functionType
}