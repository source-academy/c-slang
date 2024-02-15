import preprocessingGrammar from "bundle-text:./preprocessor.pegjs";
import lexerGrammar from "bundle-text:./lexer.pegjs";
import parsingGrammar from "bundle-text:./parser.pegjs";
import peggy, { LocationRange, Stage } from "peggy";
import ModuleRepository from "~src/modules";

/**
 * Callback that the gnerated peggy parser uses to show warnings to user
 * @param parserStage
 * @param message
 * @param location
 */
function warningCallback(
  parserStage: Stage,
  message: string,
  location: LocationRange | undefined,
): void {
  console.log(message);
  //TODO: add location info nicely in future
}

const preprocessor = peggy.generate(preprocessingGrammar as string, {
  allowedStartRules: ["program"],
  cache: true,
  warning: warningCallback,
});

const lexer = peggy.generate(lexerGrammar as string, {
  allowedStartRules: ["program"],
  cache: true,
  warning: warningCallback,
});

const parser = peggy.generate(parsingGrammar as string, {
  allowedStartRules: ["program"],
  cache: true,
  warning: warningCallback,
});

export default function parse(
  sourceCode: string,
  moduleRepository: ModuleRepository,
) {
  // eslint-disable-next-line
  // @ts-ignore
  parser.moduleRepository = moduleRepository; // make moduleRepository available to parser object
  const preprocessedOutput = preprocessor.parse(sourceCode);
  const lexedOutput = lexer.parse(preprocessedOutput);
  return parser.parse(lexedOutput);
}
