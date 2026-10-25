import { parse, errorMessage } from "pegjs-util";
import * as cparser from "./cparser";
import { TranslationUnit, TypedTranslationUnit } from "./ast/types";
import { typeTranslationUnit } from "./typing/main";
import { TypeCheckingError } from "./typing/errors";
import { Runtime } from "./interpreter/runtime";
import { DEFAULT_CONFIG, RuntimeConfig } from "./config";
import { CSyntaxError } from "./errors";
import {
  preprocessSource,
  renderText,
  offsetOfLineColumn,
  PositionMap,
  PreprocessorOptions,
} from "./preprocessor";
import { findUnsequencedConflicts } from "./analysis/unsequenced";
import { NoteSpec } from "./interpreter/notes";

/** Parses already-preprocessed `text`, translating a resulting CSyntaxError's
 * line/column back through `map` to the student's own source (A7.6) - pegjs-util
 * only reports a parse error's position as line/column, never a raw offset, so
 * `offsetOfLineColumn` recovers one (into `text`) before handing it to `map`. */
const parseText = (text: string, map: PositionMap): TranslationUnit => {
  const res = parse(cparser, text);
  if (res.error != null) {
    const offset = offsetOfLineColumn(text, res.error.line, res.error.column);
    const { line, column } = map.resolve(offset);
    const translated = { ...res.error, line, column };
    throw new CSyntaxError(translated, "\n" + errorMessage(translated, true));
  }
  return res.ast as TranslationUnit;
};

/** Type-checks `t`, translating a resulting TypeCheckingError's position back
 * through `map` the same way parseText does for a syntax error (A7.6). */
const typeCheckTranslated = (t: TranslationUnit, map: PositionMap): TypedTranslationUnit => {
  try {
    return typeTranslationUnit(t);
  } catch (err) {
    if (err instanceof TypeCheckingError) {
      const { line, column } = map.resolve(err.offset);
      throw new TypeCheckingError({ start: { offset: err.offset, line, column } }, err.rawMessage);
    }
    throw err;
  }
};

export default {
  /**
   * Phases 1-4 plus text reassembly, standalone: lets Conductor/frontend code get
   * the readable preprocessed text to show a student independently of actually
   * running their program (A7's own stated architecture goal).
   */
  preprocess(source: string, opts: PreprocessorOptions = {}): { text: string; map: PositionMap } {
    const { tokens, rawTokens, text, map } = preprocessSource(source, undefined, opts);
    return renderText(tokens, rawTokens, text, map);
  },
  parseProgram(source: string): TranslationUnit {
    const { text, map } = this.preprocess(source);
    return parseText(text, map);
  },
  typeCheck(t: TranslationUnit): TypedTranslationUnit {
    return typeTranslationUnit(t);
  },
  /** B4.6: static notes for a program, without running it. */
  analyze(source: string): NoteSpec[] {
    const { text, map } = this.preprocess(source);
    return findUnsequencedConflicts(typeCheckTranslated(parseText(text, map), map));
  },
  run(source: string, config: Partial<RuntimeConfig> = {}): Runtime {
    const { text, map } = this.preprocess(source);
    const program = parseText(text, map);
    const typedTranslationUnit = typeCheckTranslated(program, map);
    const c: RuntimeConfig = { ...DEFAULT_CONFIG, ...config };
    const rt = new Runtime(typedTranslationUnit, c);
    // Static notes sit at step 0, before anything has run.
    findUnsequencedConflicts(typedTranslationUnit).forEach((note) => rt.notes.add(note, 0));
    return rt;
  },
};
