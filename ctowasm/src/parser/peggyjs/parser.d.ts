import { CAstRoot } from "~src/parser/c-ast/core";
import { Position } from "~src/parser/c-ast/misc";
export function parse(input: string): {
  rootNode: CAstRoot;
  compilationErrors: { message: string; position: Position }[];
  warnings: { message: string; position: Position }[];
};
