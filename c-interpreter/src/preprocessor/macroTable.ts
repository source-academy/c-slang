import { PPToken, PPTokenKind } from "./ppLexer";
import { PreprocessorError } from "./errors";
import { SourcePosition } from "./position";

export interface MacroDefinition {
  name: string;
  isFunctionLike: boolean;
  parameters: string[];
  isVariadic: boolean;
  replacement: PPToken[];
}

const sameReplacementList = (a: readonly PPToken[], b: readonly PPToken[]): boolean => {
  if (a.length !== b.length) return false;
  return a.every((t, i) => {
    const u = b[i];
    if (t.text !== u.text) return false;
    if (i > 0 && t.hasLeadingWhitespace !== u.hasLeadingWhitespace) return false;
    return true;
  });
};

// (6.10.3p2) a redefinition is only permitted when it is "identical" - same
// function/object-likeness, same parameter spellings in the same order, and a
// replacement list with the same tokens and the same *presence* of whitespace
// between them (not exact whitespace amounts).
const isIdenticalDefinition = (a: MacroDefinition, b: MacroDefinition): boolean =>
  a.isFunctionLike === b.isFunctionLike &&
  a.isVariadic === b.isVariadic &&
  a.parameters.length === b.parameters.length &&
  a.parameters.every((p, i) => p === b.parameters[i]) &&
  sameReplacementList(a.replacement, b.replacement);

/** (6.10.3.2p1 / 6.10.3.3p1) '#'/'##' placement constraints, checked at #define time. */
export const validateReplacementList = (
  replacement: readonly PPToken[],
  isFunctionLike: boolean,
  parameters: readonly string[],
  isVariadic: boolean,
  pos: SourcePosition,
): void => {
  if (replacement.length > 0) {
    if (replacement[0].text === "##")
      throw new PreprocessorError(
        pos,
        "'##' cannot occur at the start of a macro replacement list",
      );
    if (replacement[replacement.length - 1].text === "##")
      throw new PreprocessorError(
        pos,
        "'##' cannot occur at the end of a macro replacement list",
      );
  }
  if (isFunctionLike) {
    const isParamName = (name: string): boolean =>
      parameters.includes(name) || (isVariadic && name === "__VA_ARGS__");
    replacement.forEach((t, i) => {
      if (t.kind === PPTokenKind.Punctuator && t.text === "#") {
        const next = replacement[i + 1];
        if (next === undefined || next.kind !== PPTokenKind.Identifier || !isParamName(next.text))
          throw new PreprocessorError(pos, "'#' is not followed by a macro parameter");
      }
    });
  }
};

export class MacroTable {
  private readonly macros = new Map<string, MacroDefinition>();

  isDefined(name: string): boolean {
    return this.macros.has(name);
  }

  get(name: string): MacroDefinition | undefined {
    return this.macros.get(name);
  }

  define(def: MacroDefinition, pos: SourcePosition): void {
    const existing = this.macros.get(def.name);
    if (existing !== undefined && !isIdenticalDefinition(existing, def)) {
      throw new PreprocessorError(
        pos,
        "redefinition of macro '" + def.name + "' with a different replacement list",
      );
    }
    this.macros.set(def.name, def);
  }

  undef(name: string): void {
    this.macros.delete(name);
  }
}
