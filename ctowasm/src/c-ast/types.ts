/**
 * Various types that are not AST nodes, but used as fields in AST nodes.
 */

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
