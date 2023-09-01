import grammar from 'grammar/main.pegjs';
import * as peggy from "peggy";

const parser = peggy.generate(grammar as string);
export default parser;