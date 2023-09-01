/**
 * Command line script for running the parser on a provided c input file.
 */
import compiler from "./build/index.js";
import yargs from "yargs";
import * as fs from "fs";
import * as path from "node:path";
import { hideBin } from "yargs/helpers";

const argv = yargs(hideBin(process.argv))
  .usage("Usage: $0 command C_input_filepath [args]")
  .options({
    o: { type: "string", alias: "out", describe: "The file to output generated output to. Defaults to \"output/wasm.out for compile, and output/ast.json for generate-ast\""}
  })
  .command("compile", "Compile the given input file to wasm")
  .command("generate-ast", "Generate the AST as a JSON file for visualisation")
  .demandCommand(2)
  .argv;

if (typeof argv._[1] === "undefined") {
  throw new Error(`No input file provided`)
}

if (!fs.existsSync(argv._[1])) {
  // file does not exist
  throw new Error(`File "${argv._[1]}" does not exist`)
}

const input = fs.readFileSync(argv._[1], 'utf-8')

let outputFile;
let output;
switch (argv._[0]) {
  case "compile":
    outputFile = argv.o ? path.resolve(argv.o) : path.resolve("output/wasm.out") 
    output = compiler.compile(input)
    break
  case "generate-ast":
    outputFile = argv.o ? path.resolve(argv.o) : path.resolve("output/a/ast.json") 
    output = compiler.generateAST(input)
    break
}

// create the output directory if output file path provided
fs.mkdirSync(path.dirname(outputFile), { recursive: true })

fs.writeFileSync(outputFile, output)

console.log(`Output saved to ${outputFile}`)