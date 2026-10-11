import { PositionMap } from "./position";

/**
 * Shared, read-only context threaded through macro expansion and #if evaluation:
 * `map` resolves a token's real source position (for __LINE__/__FILE__ and for
 * every diagnostic), and `now` is the single point in time __DATE__/__TIME__ both
 * report consistently throughout one preprocessing run, rather than drifting across
 * the many separate expand() calls one run actually makes.
 */
export interface ExpansionContext {
  map: PositionMap;
  now: Date;
}

// (6.10.8.1) the predefined macro names - shared with macroTable.ts so that
// defined()/#ifdef/#ifndef correctly treat them as always-defined, even though
// they're never actually stored as table entries (expand.ts intercepts them by name
// directly, so nothing a program #defines under these reserved names ever takes
// effect - itself undefined behavior per 6.10.8.1p2, not something worth diagnosing).
export const PREDEFINED_MACRO_NAMES: ReadonlySet<string> = new Set([
  "__LINE__",
  "__FILE__",
  "__DATE__",
  "__TIME__",
  "__STDC__",
  "__STDC_VERSION__",
]);
