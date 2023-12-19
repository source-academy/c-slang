/**
 * Various types that are not AST nodes, but used as fields in AST nodes.
 */

import { ArrayDeclaration, ArrayInitialization } from "~src/c-ast/arrays";
import { FunctionDeclaration, FunctionDefinition } from "~src/c-ast/functions";
import { Initialization, VariableDeclaration } from "~src/c-ast/variable";
import { VariableType } from "~src/common/types";
import { ProcessingError } from "~src/errors";

/**
 * This file contains the typescript interfaces for each astNode.
 */
interface Point {
  line: number;
  offset: number;
  column: number;
}

export interface Position {
  start: Point;
  end: Point;
}




