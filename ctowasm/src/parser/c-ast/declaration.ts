import { CNodeBase, Expression } from "~src/parser/c-ast/core";
import { DataType } from "~src/parser/c-ast/dataTypes";

export type Initializer = InitializerList | InitializerSingle;

export interface InitializerList extends CNodeBase {
  type: "InitializerList";
  values: Initializer[];
}

export interface InitializerSingle extends CNodeBase {
  type: "InitializerSingle";
  value: Expression;
}
export interface Declaration extends CNodeBase {
  type: "Declaration";
  dataType: DataType;
  name: string;
  initializer?: Initializer; // a declaration may be optionally initialized
}
