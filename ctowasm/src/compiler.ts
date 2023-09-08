/**
 * Compiler for C to webassembly
 */
import parser from 'parser/parser';
import process from 'c-ast/processor';

export function compile(cSourceCode: string) {
  const ast = process(parser.parse(cSourceCode), cSourceCode);
  return ast;
}

export  function generateAST(cSourceCode: string) {
  const ast = process(parser.parse(cSourceCode), cSourceCode);
  return JSON.stringify(ast) 
}

