/**
 * Thrown for a C language feature c-interpreter doesn't support yet. Distinct from a
 * generic `Error` so callers (e.g. a Conductor evaluator wrapper) can tell "this program uses a
 * feature we haven't built" apart from a genuine runtime fault in the program itself, instead of
 * matching on the message string.
 */
// C17 6.5p2: a side effect on a scalar object unsequenced relative to another
// side effect on it, or to a read of it, is undefined behaviour (B4.5).
export class UnsequencedAccessError extends Error {
  constructor(explanation: string) {
    super("undefined behaviour: " + explanation);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class NotImplementedError extends Error {
  readonly feature: string;

  constructor(feature: string) {
    super(`c-interpreter does not yet support: ${feature}`);
    this.feature = feature;
    Object.setPrototypeOf(this, NotImplementedError.prototype);
  }
}
