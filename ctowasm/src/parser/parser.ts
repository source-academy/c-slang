import parsingGrammar from "bundle-text:./parser.pegjs";
import preprocessingGrammar from "bundle-text:./preprocessor.pegjs";
import peggy from "peggy";

const preprocessor = peggy.generate(preprocessingGrammar as string, {
  allowedStartRules: ["source_code"],
  cache: true,
}); 

const parser = peggy.generate(parsingGrammar as string, {
  allowedStartRules: ["program"],
  cache: true,
});


export default function parse(sourceCode: string) {
  return parser.parse(preprocessor.parse(sourceCode));
}
