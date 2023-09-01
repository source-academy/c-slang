/**
 * Compiler for C to webassembly
 */
import parser from 'parser';
import process from 'processor';

export function compile(cSourceCode: string) {
  const ast = process(parser.parse(cSourceCode), cSourceCode);
  return ast;
}

export  function generateAST(cSourceCode: string) {
  const ast = process(parser.parse(cSourceCode), cSourceCode);
  return JSON.stringify(ast) 
}

