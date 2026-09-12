// See CEvaluator.ts's header comment re: ESM-only @sourceacademy/conductor.
import { initialise } from "@sourceacademy/conductor/runner";
import CEvaluator from "./CEvaluator";

const { runnerPlugin, conduit } = initialise(CEvaluator);

declare const self: any;
self.cVizRunnerPlugin = runnerPlugin;
self.cVizConduit = conduit;
