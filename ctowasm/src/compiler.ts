/**
 * Compiler for C to webassembly
 */
import parser from "./parser/parser";
import process from "./c-ast/processor";
import { translate } from "./translator";
import { generateWAT } from "./wat-generator";
import { compileWatToWasm } from "./wat-compiler";


export async function compile(cSourceCode: string): Promise<Uint8Array> {
  const output = await compileWatToWasm(generateWAT(
    translate(process(parser.parse(cSourceCode), cSourceCode))
  ));
  return output;
}

export function compileToWat(cSourceCode: string) {
  const output = generateWAT(
    translate(process(parser.parse(cSourceCode), cSourceCode))
  );
  return output;
}

export async function compileWithLogStatements(cSourceCode: string): Promise<Uint8Array>  {
  const output = await compileWatToWasm(generateWAT(
    translate(process(parser.parse(cSourceCode), cSourceCode), true),
    0,
    true
  ));
  return output;
}

/**
 * Generates WAT code with log statements for testing.
 */
export function compileToWatWithLogStatements(cSourceCode: string) {
  const output = generateWAT(
    translate(process(parser.parse(cSourceCode), cSourceCode), true),
    0,
    true
  );
  return output;
}

export function generate_C_AST(cSourceCode: string) {
  const ast = parser.parse(cSourceCode);
  return JSON.stringify(ast);
}

export function generate_processed_C_AST(cSourceCode: string) {
  const ast = process(parser.parse(cSourceCode), cSourceCode);
  return JSON.stringify(ast);
}

export function generate_WAT_AST(cSourceCode: string) {
  const ast = translate(process(parser.parse(cSourceCode), cSourceCode));
  return JSON.stringify(ast);
}
