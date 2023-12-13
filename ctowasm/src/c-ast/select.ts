/**
 * Definitions for select statement.
 */

import { CNode, Block, Expression } from "~src/c-ast/core";

export interface SelectStatement extends CNode {
  type: "SelectStatement";
  ifBlock: ConditionalBlock;
  elseIfBlocks: ConditionalBlock[];
  elseBlock?: Block | null;
}

export interface ConditionalBlock extends CNode {
  type: "ConditionalBlock";
  condition: Expression;
  block: Block;
}
