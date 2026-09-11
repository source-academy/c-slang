import { parse, errorMessage } from "pegjs-util";
import * as cparser from "./cparser";
import { TranslationUnit, TypedTranslationUnit } from "./ast/types";
import { typeTranslationUnit } from "./typing/main";
import { Runtime } from "./interpreter/runtime";
import { DEFAULT_CONFIG, RuntimeConfig } from "./config";

export default {
  parseProgram(source: string): TranslationUnit {
    const res = parse(cparser, source);
    if (res.error != null) {
      throw new Error("\n" + errorMessage(res.error, true));
    }
    return res.ast as TranslationUnit;
  },
  typeCheck(t: TranslationUnit): TypedTranslationUnit {
    return typeTranslationUnit(t);
  },
  run(source: string, config: Partial<RuntimeConfig> = {}): Runtime {
    const program = this.parseProgram(source);
    const typedTranslationUnit = this.typeCheck(program);
    const c: RuntimeConfig = { ...DEFAULT_CONFIG, ...config };
    return new Runtime(typedTranslationUnit, c);
  },
};
