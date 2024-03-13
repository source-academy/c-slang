import preprocessingGrammar from "bundle-text:./preprocessor.pegjs";
import lexerGrammar from "bundle-text:./lexer.pegjs";
import parsingGrammar from "bundle-text:./parser.pegjs";
import peggy from "peggy";
import ModuleRepository from "~src/modules";
import { CAstRoot } from "~src/parser/c-ast/core";
import {
  ParserCompilationErrors,
  generateCompilationWarningMessage,
} from "~src/errors";
import { Position } from "~src/parser/c-ast/misc";

const preprocessor = peggy.generate(preprocessingGrammar as string, {
  allowedStartRules: ["program"],
  cache: true,
});

const lexer = peggy.generate(lexerGrammar as string, {
  allowedStartRules: ["program"],
  cache: true,
});

const parser = peggy.generate(parsingGrammar as string, {
  allowedStartRules: ["program"],
  cache: true,
});

export interface ParserOutput {
  cAstRoot: CAstRoot;
  warnings: string[];
}

export default function parse(
  sourceCode: string,
  moduleRepository: ModuleRepository
) {
  try {
// eslint-disable-next-line
  // @ts-ignore
  parser.moduleRepository = moduleRepository; // make moduleRepository available to parser object
  const preprocessedOutput = preprocessor.parse(sourceCode);
  // eslint-disable-next-line
  // @ts-ignore
  lexer.falseNewlinePositions = preprocessor.falseNewlinePositions;
  const lexedOutput = lexer.parse(preprocessedOutput);
  // eslint-disable-next-line
  // @ts-ignore
  parser.tokenPositions = lexer.tokenPositions;
  const { rootNode, compilationErrors, warnings } = parser.parse(lexedOutput);
  if (compilationErrors.length > 0) {
    throw new ParserCompilationErrors(
      sourceCode,
      compilationErrors as { message: string; position: Position }[]
    );
  }
  return {
    cAstRoot: rootNode,
    warnings: warnings.map((w: { message: string; position: Position }) =>
      generateCompilationWarningMessage(w.message, sourceCode, w.position)
    ),
  };
  } catch (e) {
    // catch syntax errors detected by peggy js
    if ("location" in (e as object)) {
      throw new ParserCompilationErrors(sourceCode, [{message: (e as any).message, position: (e as any).location}]);
    }
    throw e;
  }
  
}
