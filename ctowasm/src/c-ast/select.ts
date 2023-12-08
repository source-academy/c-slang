/**
 * Definitions for select statement.
 */

import { ScopedNode, Block, Expression } from "~src/c-ast/root";

export interface SelectStatement extends ScopedNode {
  type: "SelectStatement";
  ifBlock: ConditionalBlock;
  elseIfBlocks: ConditionalBlock[];
  elseBlock?: Block | null;
}

export interface ConditionalBlock extends ScopedNode {
  type: "ConditionalBlock";
  condition: Expression;
  block: Block;
}
