/**
 * Thrown for a C language feature c-viz's interpreter doesn't support yet. Distinct from a
 * generic `Error` so callers (e.g. a Conductor evaluator wrapper) can tell "this program uses a
 * feature we haven't built" apart from a genuine runtime fault in the program itself, instead of
 * matching on the message string.
 */
export class NotImplementedError extends Error {
  constructor(feature: string) {
    super(`c-viz does not yet support: ${feature}`);
    Object.setPrototypeOf(this, NotImplementedError.prototype);
  }
}
