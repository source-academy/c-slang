/**
 * Compiler for C to webassembly
 */
import { parse } from "./grammar/parser"

// TODO: change this temporary setup
export default {compile: x => parse(x).toString()}
