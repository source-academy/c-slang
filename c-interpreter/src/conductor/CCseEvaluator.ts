import CEvaluator from "./CEvaluator";

/**
 * Placeholder for the CSE Machine-instrumented evaluator. Sending snapshots over the __cse
 * channel as the program steps isn't implemented yet -- this class is currently identical to
 * CEvaluator. It exists so the build produces two real, separately-loadable bundles now, matching
 * what language-directory's registration expects (one evaluator per capability set, e.g.
 * py-slang's python4Py2js/python4Cse pair), without waiting on that visualization work to land.
 */
export default class CCseEvaluator extends CEvaluator {}
