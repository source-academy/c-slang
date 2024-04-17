// Script for generating parsers from peggyjs grammars
import { readFileSync, writeFileSync } from 'node:fs';

const preprocessor = peggy.generate(readFileSync(path.resolve(__dirname, "preprocessor.pegjs")), {
  allowedStartRules: ["program"],
  cache: true,
});

const lexer = peggy.generate(readFileSync(path.resolve(__dirname, "lexer.pegjs")), {
  allowedStartRules: ["program"],
  cache: true,
});

const parser = peggy.generate(readFileSync(path.resolve(__dirname, "parser.pegjs")), {
  allowedStartRules: ["program"],
  cache: true,
});

writeFileSync(path.resolve(__dirname, "preprocessor.js"), );
writeFileSync(path.resolve(__dirname, "lexer.js"))
writeFileSync(path.resolve(__dirname, "parser.js"))