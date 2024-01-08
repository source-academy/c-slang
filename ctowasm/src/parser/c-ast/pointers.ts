/**
 * Definitions of nodes relating to expressions on pointers.
 */

import { CNodeBase, Expression } from "~src/parser/c-ast/core";

export interface PointerDereference extends CNodeBase {
  type: "PointerDereference",
  expr:  Expression // the expression being dereferenced
}

export interface AddressOfExpression extends CNodeBase {
  type: "AddressOfExpression",
  expr: Expression // the expression whose address is being dereferenced. Must be an lvalue.
}