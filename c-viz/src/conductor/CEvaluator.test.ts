/**
 * Exercises CEvaluator against a mocked IRunnerPlugin -- no real Worker, host, or Rollup bundle
 * needed. Run via `yarn test:conductor` (see package.json): that script bundles this file with
 * esbuild (not just `tsc`) and runs the result with plain `node`, because @sourceacademy/
 * conductor is ESM-only and CEvaluator's own CommonJS-compiled `require()` calls can't resolve
 * it -- only a real bundler, resolving the package's exports map and flattening every import
 * into one file, gets this to actually execute. See CEvaluator.ts's header comment for the full
 * CommonJS/ESM story.
 */
import assert from "node:assert/strict";
import CEvaluator from "./CEvaluator";

interface LogEntry {
  type: "output" | "result" | "error" | "status";
  [key: string]: unknown;
}

function makeMockConductor() {
  const log: LogEntry[] = [];
  const conductor = {
    log,
    requestFile: async () => undefined,
    requestChunk: async () => ({ chunk: "" }) as any,
    requestInput: async () => "",
    tryRequestInput: () => undefined,
    sendOutput: (m: string) => log.push({ type: "output", m }),
    sendResult: (r: unknown) => log.push({ type: "result", r }),
    sendError: (e: any) =>
      log.push({
        type: "error",
        name: e?.name,
        errorType: e?.errorType,
        message: e?.message,
        line: e?.line,
        column: e?.column,
      }),
    updateStatus: (s: unknown, active: boolean) => log.push({ type: "status", s, active }),
    hostLoadPlugin: async () => {},
    hostQueryPluginResolutions: async () => ({}),
    registerPlugin: (() => {
      throw new Error("not used in this test");
    }) as any,
    unregisterPlugin: () => {},
    registerModule: (() => {
      throw new Error("not used in this test");
    }) as any,
    unregisterModule: () => {},
    importAndRegisterExternalPlugin: async () => {
      throw new Error("not used in this test");
    },
    importAndRegisterExternalModule: async () => {
      throw new Error("not used in this test");
    },
  };
  return conductor;
}

async function evaluate(source: string) {
  const conductor = makeMockConductor();
  const ev = new CEvaluator(conductor as any);
  await ev.evaluateChunk(source);
  return conductor.log;
}

async function testValidProgram() {
  // print() is one of c-viz's built-in functions (BUILTIN_FUNCTIONS in builtins.ts) -- it's
  // already in scope without a prototype, and c-viz doesn't support function forward
  // declarations at all (typing/main.ts explicitly rejects them), so this must not declare one.
  const log = await evaluate(`
    int main() { print(42); return 7; }
  `);
  const output = log.find((e) => e.type === "output");
  const result = log.find((e) => e.type === "result");
  assert.ok(output, "expected an output message");
  assert.equal(output!.m, "42\n");
  assert.ok(result, "expected a result message");
  assert.equal(result!.r, 7);
  assert.ok(
    !log.some((e) => e.type === "error"),
    "a valid program should not send an error",
  );
}

async function testSyntaxError() {
  const log = await evaluate("int main( { return 0; }");
  const error = log.find((e) => e.type === "error");
  assert.ok(error, "expected an error message");
  assert.equal(error!.errorType, "__evaluator_syntax");
  assert.equal(error!.line, 1);
  assert.equal(typeof error!.column, "number");
}

async function testTypeError() {
  const log = await evaluate('int main() { return "oops"; }');
  const error = log.find((e) => e.type === "error");
  assert.ok(error, "expected an error message");
  assert.equal(error!.errorType, "__evaluator");
  assert.equal(error!.line, 1);
}

async function testNotImplemented() {
  const log = await evaluate("int main() { int x = 1; x += 2; return 0; }");
  const error = log.find((e) => e.type === "error");
  assert.ok(error, "expected an error message");
  assert.equal(error!.errorType, "__evaluator_runtime");
  assert.match(error!.message as string, /compound assignment/);
}

async function testStatusUpdatesBracketEvaluation() {
  const log = await evaluate("int main() { return 0; }");
  const statuses = log.filter((e) => e.type === "status");
  assert.equal(statuses.length, 2, "expected exactly one RUNNING-start and one RUNNING-end");
  assert.equal(statuses[0].active, true);
  assert.equal(statuses[1].active, false);
}

async function main() {
  const tests: [string, () => Promise<void>][] = [
    ["valid program produces output and result", testValidProgram],
    ["syntax error carries structured line/column", testSyntaxError],
    ["type error carries structured line/column", testTypeError],
    ["unimplemented feature reports its name, not a generic message", testNotImplemented],
    ["status is toggled around evaluation", testStatusUpdatesBracketEvaluation],
  ];

  let failures = 0;
  for (const [name, fn] of tests) {
    try {
      await fn();
      console.log(`ok - ${name}`);
    } catch (e) {
      failures++;
      console.error(`FAIL - ${name}`);
      console.error(e);
    }
  }

  if (failures > 0) {
    console.error(`\n${failures}/${tests.length} test(s) failed`);
    process.exit(1);
  }
  console.log(`\nall ${tests.length} test(s) passed`);
}

main();
