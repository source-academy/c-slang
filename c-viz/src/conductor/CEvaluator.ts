// @sourceacademy/conductor is ESM-only (no "require" export condition), while the rest of c-viz
// compiles to CommonJS. These imports type-check because src/conductor/tsconfig.json overrides
// module/moduleResolution to ESM-flavored settings for this directory only (see that file) --
// but that only makes tsc happy. Actually running this file needs a real bundle -- either
// `yarn test:conductor` (esbuild) or the real build (`yarn build:conductor`, see
// rollup.conductor.config.mjs) -- rather than a plain `node`/`ts-node` invocation, because Node's
// own module loader enforces the same CommonJS/ESM boundary tsc's classic resolution does, and no
// compiler flag can make a CommonJS `require()` load an "import"-only package.
import { BasicEvaluator } from "@sourceacademy/conductor/runner";
import type { IRunnerPlugin } from "@sourceacademy/conductor/runner";
import { RunnerStatus } from "@sourceacademy/conductor/types";
import { ConductorError, ConductorInternalError } from "@sourceacademy/conductor/common";
import cviz from "../index";
import { Runtime } from "../interpreter/runtime";
import { DEFAULT_CONFIG } from "../config";
import { TranslationUnit, TypedTranslationUnit } from "../ast/types";
import {
  messageOf,
  toConfigError,
  toRuntimeError,
  toSyntaxError,
  toTypeCheckError,
} from "./errors";

/**
 * Conductor integration for c-viz. Treats each `evaluateChunk` call as "run this whole program"
 * rather than an incrementally-extended REPL chunk -- C has no REPL concept the way Scheme/Python
 * do, so that's the simplest correct mapping.
 *
 * `cviz.run()` isn't used directly: it bundles parsing, type-checking, and constructing the
 * `Runtime` into one call, which would make it impossible to tell *which* phase failed from the
 * outside -- and that's exactly the information needed to pick the right Conductor error
 * subclass. The three phases are called and caught separately instead.
 */
export default class CEvaluator extends BasicEvaluator {
  constructor(conductor: IRunnerPlugin) {
    super(conductor);
  }

  async evaluateChunk(chunk: string): Promise<number | undefined> {
    this.conductor.updateStatus(RunnerStatus.RUNNING, true);
    try {
      let program: TranslationUnit;
      try {
        program = cviz.parseProgram(chunk);
      } catch (e) {
        throw toSyntaxError(e);
      }

      let typedProgram: TypedTranslationUnit;
      try {
        typedProgram = cviz.typeCheck(program);
      } catch (e) {
        throw toTypeCheckError(e);
      }

      let rt: Runtime;
      try {
        rt = new Runtime(typedProgram, DEFAULT_CONFIG);
      } catch (e) {
        throw toConfigError(e);
      }

      // rt.exitCode is guaranteed to become defined before the agenda empties: the Agenda
      // constructor always pushes a trailing EXIT instruction, so this loop can't run off the
      // end into Runtime.next()'s "agenda is empty" guard under normal execution.
      let sentLength = 0;
      try {
        while (rt.exitCode === undefined) {
          rt.next();
          if (rt.stdout.length > sentLength) {
            this.conductor.sendOutput(rt.stdout.slice(sentLength));
            sentLength = rt.stdout.length;
          }
        }
      } catch (e) {
        // Flush whatever output the failing step produced before it crashed, so it isn't lost.
        if (rt.stdout.length > sentLength) {
          this.conductor.sendOutput(rt.stdout.slice(sentLength));
        }
        throw toRuntimeError(e);
      }

      // BasicEvaluator's own runner loop (startEvaluator) already calls conductor.sendResult on
      // whatever evaluateChunk returns -- calling it again here double-sends the result, and the
      // second (framework-driven) call lands on a later microtask than this synchronous one,
      // arriving out of order relative to any not-yet-flushed sendOutput calls.
      return rt.exitCode;
    } catch (e) {
      // Every throw above already goes through one of the toXError() helpers, so this should
      // always be a ConductorError -- the fallback wrapping is a last-resort guard against a bug
      // in this file itself, not an expected path.
      const err = e instanceof ConductorError ? e : new ConductorInternalError(messageOf(e));
      this.conductor.sendError(err);
      return undefined;
    } finally {
      this.conductor.updateStatus(RunnerStatus.RUNNING, false);
    }
  }
}
