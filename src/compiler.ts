/**
 * Compiler for C to webassembly
 */
import * as peggy from "peggy";
// cGrammar is configured to be imported as a string by esbuild bundler
import cGrammar from "./grammar/main.pegjs";

const compiler = peggy.generate(cGrammar as string);

// TODO: change this temporary setup
export default {compile: x => compiler.parse(x).toString()}
