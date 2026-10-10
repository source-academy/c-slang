import { SourcePosition } from "./position";

/**
 * Thrown by the preprocessor (lexing, directive processing, macro expansion) on
 * malformed input. Carries a position already translated back to the student's own
 * source, same role `CSyntaxError`/`TypeCheckingError` play for the parser/type-checker.
 */
export class PreprocessorError extends Error {
  readonly line: number;
  readonly column: number;

  constructor(pos: SourcePosition, message: string) {
    super("line " + pos.line + " col " + pos.column + ": " + message);
    this.line = pos.line;
    this.column = pos.column;
    Object.setPrototypeOf(this, PreprocessorError.prototype);
  }
}
