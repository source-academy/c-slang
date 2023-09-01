/**
 * Compiler for C to webassembly
 */
import * as grammar from 'grammar/main.pegjs';
import * as peggy from "peggy";

const parser = peggy.generate(grammar as string);

// TODO: change this temporary setup
export default {
  compile: (x: string) => JSON.stringify(parser.parse(x)),
  generateAST: (x: string) => JSON.stringify(parser.parse(x))
}
