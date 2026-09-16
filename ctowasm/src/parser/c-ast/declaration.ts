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

export type Declaration = VariableDeclaration | EnumDeclaration;

export interface VariableDeclaration extends CNodeBase {
  type: "Declaration";
  dataType: DataType;
  storageClass: "auto" | "static"; // should be auto by default
  name: string;
  initializer?: Initializer; // a declaration may be optionally initialized
}

/**
 * Represents a declaration of an enum.
 */
export interface EnumDeclaration extends CNodeBase {
  type: "EnumDeclaration";
  enumerators: { name: string; value?: Expression }[];
}
