/**
 * Compiler for C to webassembly
 */
import parser from 'parser';

// TODO: change this temporary setup
export default {
  compile: (x: string) => JSON.stringify(parser.parse(x)),
  generateAST: (x: string) => JSON.stringify(parser.parse(x))
}
