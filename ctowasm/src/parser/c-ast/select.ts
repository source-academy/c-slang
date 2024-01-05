/**
 * Definitions for select statement.
 */

import { CNodeBase, Block, Expression } from "~src/parser/c-ast/core";

export interface SelectStatement extends CNodeBase {
  type: "SelectStatement";
  ifBlock: ConditionalBlock;
  elseIfBlocks: ConditionalBlock[];
  elseBlock?: Block | null;
}

export interface ConditionalBlock extends CNodeBase {
  type: "ConditionalBlock";
  condition: Expression;
  block: Block;
}
