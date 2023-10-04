/**
 * Compiler for C to webassembly
 */
import parser from "parser/parser";
import process from "c-ast/processor";
import { translate } from "translator";
import { generateWAT } from "wat-generator";

export function compile(cSourceCode: string) {
  const output = generateWAT(
    translate(process(parser.parse(cSourceCode), cSourceCode)),
  );
  return output;
}

export function generate_C_AST(cSourceCode: string) {
  const ast = process(parser.parse(cSourceCode), cSourceCode);
  return JSON.stringify(ast);
}

export function generate_WAT_AST(cSourceCode: string) {
  const ast = translate(process(parser.parse(cSourceCode), cSourceCode));
  return JSON.stringify(ast);
}
