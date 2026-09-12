// See CEvaluator.ts's header comment re: ESM-only @sourceacademy/conductor and this
// directory's own tsconfig.json.
import {
  ConductorError,
  ConductorInternalError,
  EvaluatorError,
  EvaluatorRuntimeError,
  EvaluatorSyntaxError,
} from "@sourceacademy/conductor/common";
import { CSyntaxError } from "../errors";
import { TypeCheckingError } from "../typing/errors";

/**
 * Coerces whatever was thrown into a message string. c-viz doesn't always throw `Error`
 * instances -- several `typing/main.ts` sites throw bare strings.
 */
export function messageOf(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (typeof e === "string") return e;
  return String(e);
}

/** Wraps a `parseProgram()` failure, keeping the structured position `CSyntaxError` carries. */
export function toSyntaxError(e: unknown): ConductorError {
  if (e instanceof CSyntaxError)
    return new EvaluatorSyntaxError(e.message, e.line, e.column);
  return new EvaluatorSyntaxError(messageOf(e));
}

/**
 * Wraps a `typeCheck()` failure, keeping the structured position `TypeCheckingError` carries.
 *
 * Deliberately `EvaluatorError`, not `EvaluatorTypeError`: that subclass requires structured
 * `expected`/`actual` fields c-viz's type checker doesn't produce (every `typing/main.ts` throw
 * site is just a message string) -- inventing placeholder values to fit the stricter shape would
 * be less honest than using the generic "problem in user code" bucket.
 */
export function toTypeCheckError(e: unknown): ConductorError {
  if (e instanceof TypeCheckingError)
    return new EvaluatorError(e.message, e.line, e.column);
  return new EvaluatorError(messageOf(e));
}

/**
 * Wraps a failure from stepping the `Runtime` (i.e. from inside the `while (exitCode ===
 * undefined) rt.next()` loop). No structured position yet -- c-viz's interpreter doesn't attach
 * node position to its throws the way the type checker does; a candidate follow-up patch, not
 * done here.
 */
export function toRuntimeError(e: unknown): ConductorError {
  return new EvaluatorRuntimeError(messageOf(e));
}

/**
 * Wraps a failure constructing the `Runtime` itself (e.g. an invalid `RuntimeConfig`) --
 * a contract violation between the host and the evaluator, not a fault in the student's C
 * source, so it belongs in Conductor's "protocol misuse" bucket rather than an evaluator error.
 */
export function toConfigError(e: unknown): ConductorError {
  return new ConductorInternalError(messageOf(e));
}
