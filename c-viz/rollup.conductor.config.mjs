import commonjs from "@rollup/plugin-commonjs";
import nodeResolve from "@rollup/plugin-node-resolve";
import terser from "@rollup/plugin-terser";
import typescript from "@rollup/plugin-typescript";

// Builds the Conductor evaluator bundles c-viz ships. Each is loaded directly into a fresh Worker
// via a blob URL -- there's no module loader present in that context, so each needs to be a fully
// self-contained IIFE with no import/require left in the output at all. IIFE output can't be
// split across multiple entries in one build the way esm/cjs output can (an IIFE has no mechanism
// for one chunk to reference another once bundled), so this exports an array of independent
// configs -- one per entry -- rather than a single multi-entry config. Each config gets its own
// plugin instances rather than sharing one array, since some plugins (typescript in particular)
// carry per-build state.
//
// @rollup/plugin-typescript is pointed at src/conductor/tsconfig.json, not the project root
// tsconfig.json: Rollup's own bundling works over real ES module syntax internally regardless of
// the final output format, so the TypeScript compilation step feeding it needs an ESM-flavored
// module setting (matching conductor-runner-example's own tsconfig) -- the root tsconfig's
// CommonJS setting is for the rest of c-viz's unrelated Grunt/Browserify build.
const entries = [
  { name: "CEvaluator", input: "src/conductor/entries/plain.ts" },
  { name: "CCseEvaluator", input: "src/conductor/entries/cse.ts" },
];

export default entries.map(({ name, input }) => ({
  input,
  plugins: [
    nodeResolve({ browser: true, preferBuiltins: false }),
    commonjs(),
    // outDir/declaration are overridden here (not in src/conductor/tsconfig.json itself): that
    // tsconfig is also used for plain `tsc --noEmit` type-checking, where they're irrelevant
    // (noEmit never writes anything) -- but this plugin validates them even when Rollup itself
    // owns the actual file output, and the inherited root tsconfig's outDir ("lib") doesn't
    // relate to Rollup's own output directory ("dist") at all.
    typescript({
      tsconfig: "src/conductor/tsconfig.json",
      compilerOptions: { outDir: "dist", declaration: false },
    }),
    terser(),
  ],
  output: {
    file: `dist/${name}.js`,
    format: "iife",
    sourcemap: true,
  },
}));
