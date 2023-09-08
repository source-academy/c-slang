import * as esbuild from "esbuild";

const config = {
  entryPoints: ["src/index.ts"],
  bundle: true,
  format: "esm",
  outfile: "build/index.js",
  loader: {
    '.pegjs': 'text' // import pegjs files as text
  }
};

if (process.env.WATCH) {
  const context = await esbuild.context(config);

  await context.rebuild();
  console.log("Started development mode");
  console.log("Watching for changes...");
  // set up watching of the src folder files, so that rebuild is automatically triggered when files are edited and saved.
  await context.watch();
} else {
  await esbuild.build(config);
}
