/**
 * Command line script for running the parser on a provided c input file.
 */
import compiler from "./build/index.js";
import yargs from "yargs";
import * as fs from "fs";
import * as path from "node:path";
import { hideBin } from "yargs/helpers";

const argv = yargs(hideBin(process.argv))
  .usage("Usage: $0 C_input_filepath [args]")
  .options({
    o: { type: "string", alias: "out", default: "output/wasm.out", describe: "The file to output wasm to."},
  })
  .demandCommand(1)
  .argv;

if (!fs.existsSync(argv._[0])) {
  // file does not exist
  throw new Error(`File "${argv._[0]}" does not exist`)
}

const input = fs.readFileSync(argv._[0], 'utf-8')
const output = compiler.compile(input)

// create the output directory if output file path provided
if (argv.o) {
  fs.mkdirSync(path.dirname(argv.o), { recursive: true })
}

const outputFile = argv.o ? path.resolve(argv.o) : path.resolve("/output/wasm.out")

fs.writeFileSync(outputFile, output)

console.log(`Compilation succeeded. Output saved to ${outputFile}`)