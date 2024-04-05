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

    try {
      const { rootNode, compilationErrors, warnings } =
        parser.parse(lexedOutput);

      if (compilationErrors.length > 0) {
        // this handles any errors that were detected but didnt stop parsing
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
      // or any error that required immediately ending of parsing
      if ("location" in (e as object)) {
        // parser locations from syntax errors (or any thrown immediate errors) need to be adjusted
        if (
          !(lexer as any).tokenPositions.has((lexer as any).tokenPositions.get)
        ) {
          // in case the location was a artificial whitespace separating tokens
          throw new ParserCompilationErrors(sourceCode, [
            {
              message: "syntax error in program",
              position: {
                start: { offset: 0, line: 0, column: 0 },
                end: { offset: 0, line: 0, column: 0 },
              },
            },
          ]);
        }
        const adjustedLocation = {
          start: (lexer as any).tokenPositions.get(
            (e as any).location.start.offset
          ).start,
          end: (lexer as any).tokenPositions.get(
            Math.max(
              (e as any).location.start.offset,
              (e as any).location.end.offset - 1
            )
          ).end,
        };
        throw new ParserCompilationErrors(sourceCode, [
          { message: (e as any).message, position: adjustedLocation },
        ]);
      }
      throw e;
    }
  } catch (e) {
    // catch any other errors
    if (
      !(e instanceof ParserCompilationErrors) &&
      "location" in (e as object)
    ) {
      throw new ParserCompilationErrors(sourceCode, [
        { message: (e as any).message, position: (e as any).location },
      ]);
    }
    throw e;
  }
}
