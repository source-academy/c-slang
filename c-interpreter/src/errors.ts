/** The shape `pegjs-util`'s `parse()` returns as `res.error` on a failed parse. */
interface PegSyntaxError {
  line: number;
  column: number;
  message: string;
  found: string;
  expected: string;
}

/**
 * Thrown by `parseProgram` on a syntax error. Carries the structured position `pegjs-util`
 * already computes (`line`/`column`/`found`/`expected`), rather than only the pre-formatted
 * message string that used to be all `parseProgram` preserved.
 */
export class CSyntaxError extends Error {
  readonly line: number;
  readonly column: number;
  readonly found: string;
  readonly expected: string;

  constructor(res: PegSyntaxError, formatted: string) {
    super(formatted);
    this.line = res.line;
    this.column = res.column;
    this.found = res.found;
    this.expected = res.expected;
    Object.setPrototypeOf(this, CSyntaxError.prototype);
  }
}
