// See CEvaluator.ts's header comment re: ESM-only @sourceacademy/conductor. This file is the
// Rollup entry point for the CSE-instrumented bundle -- see ../../../rollup.conductor.config.mjs
// and CCseEvaluator.ts (currently a stub; real CSE snapshot-sending isn't implemented yet).
import { initialise } from "@sourceacademy/conductor/runner";
import CCseEvaluator from "../CCseEvaluator";

const { runnerPlugin, conduit } = initialise(CCseEvaluator);

declare const self: any;
self.cVizRunnerPlugin = runnerPlugin;
self.cVizConduit = conduit;
