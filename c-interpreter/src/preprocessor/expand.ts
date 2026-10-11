import { PPToken, PPTokenKind, tokenize } from "./ppLexer";
import { MacroDefinition, MacroTable } from "./macroTable";
import { PreprocessorError } from "./errors";
import { PositionMap, SourcePosition } from "./position";
import { ExpansionContext } from "./context";

/**
 * Dave Prosser's macro-expansion algorithm, implemented directly rather than
 * approximated: every token carries a hide set (the macro names that must not
 * re-expand it), so self- and mutual-recursion terminate correctly without a
 * depth limit or a simplified "currently expanding" stack - see a7-plan.md's
 * A7.2 section and this project's own week-3 research note on why the
 * intersection rule at function-like call sites specifically matters.
 */
export interface HSToken {
  token: PPToken;
  hideSet: ReadonlySet<string>;
}

const EMPTY_SET: ReadonlySet<string> = new Set();

const union = (a: ReadonlySet<string>, b: ReadonlySet<string>): Set<string> => {
  const r = new Set(a);
  b.forEach((x) => r.add(x));
  return r;
};

const intersect = (a: ReadonlySet<string>, b: ReadonlySet<string>): Set<string> => {
  const r = new Set<string>();
  a.forEach((x) => {
    if (b.has(x)) r.add(x);
  });
  return r;
};

const hsadd = (hs: ReadonlySet<string>, tokens: readonly HSToken[]): HSToken[] =>
  tokens.map((t) => ({ token: t.token, hideSet: union(hs, t.hideSet) }));

export const withFreshHideSets = (tokens: readonly PPToken[]): HSToken[] =>
  tokens.map((token) => ({ token, hideSet: EMPTY_SET }));

const tokenizeStandalone = (text: string): PPToken[] => {
  const identity = Array.from({ length: text.length + 1 }, (_, i) => i);
  const map = new PositionMap(text, identity, null);
  return tokenize(text, map);
};

// (6.10.3.2p2) whitespace between an argument's tokens collapses to one space;
// leading/trailing whitespace is dropped entirely; embedded " and \ inside a
// string literal or character constant operand get an extra \ in front.
const stringize = (arg: readonly HSToken[], at: PPToken): HSToken => {
  let s = "";
  arg.forEach((t, i) => {
    if (i > 0 && t.token.hasLeadingWhitespace) s += " ";
    const text = t.token.text;
    if (t.token.kind === PPTokenKind.StringLiteral || t.token.kind === PPTokenKind.CharacterConstant) {
      s += text.replace(/[\\"]/g, "\\$&");
    } else {
      s += text;
    }
  });
  return {
    token: {
      kind: PPTokenKind.StringLiteral,
      text: '"' + s + '"',
      start: at.start,
      end: at.end,
      line: at.line,
      hasLeadingWhitespace: at.hasLeadingWhitespace,
    },
    hideSet: EMPTY_SET,
  };
};

// (6.10.3.3p3) paste the two tokens' spellings together and re-lex the result as a
// single preprocessing token; anything that doesn't re-lex as exactly one token is
// a constraint violation, diagnosed rather than silently accepted as two tokens.
const glue = (left: readonly HSToken[], right: HSToken, pos: SourcePosition): HSToken[] => {
  if (left.length === 0) return [right];
  const lastIdx = left.length - 1;
  const last = left[lastIdx];
  const combinedText = last.token.text + right.token.text;
  const retokenized = tokenizeStandalone(combinedText);
  if (retokenized.length !== 1) {
    throw new PreprocessorError(
      pos,
      "'##' produced an invalid preprocessing token: '" + combinedText + "'",
    );
  }
  const pasted: HSToken = {
    token: {
      kind: retokenized[0].kind,
      text: combinedText,
      start: last.token.start,
      end: right.token.end,
      line: last.token.line,
      hasLeadingWhitespace: last.token.hasLeadingWhitespace,
    },
    hideSet: last.hideSet,
  };
  return [...left.slice(0, lastIdx), pasted];
};

const makeToken = (kind: PPTokenKind, text: string, at: PPToken): PPToken => ({
  kind,
  text,
  start: at.start,
  end: at.end,
  line: at.line,
  hasLeadingWhitespace: at.hasLeadingWhitespace,
});

const quoteString = (s: string): string => '"' + s.replace(/[\\"]/g, "\\$&") + '"';

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const pad2 = (n: number): string => (n < 10 ? "0" : "") + n;

// (6.10.8.1) __DATE__/__TIME__ format: "Mmm dd yyyy" (day space-padded, not zero-padded)
// and "hh:mm:ss" - both using the single timestamp this whole preprocessing run shares
// (`ExpansionContext.now`), not a fresh one per use.
const formatDate = (d: Date): string => {
  const day = d.getDate();
  return MONTHS[d.getMonth()] + " " + (day < 10 ? " " : "") + day + " " + d.getFullYear();
};
const formatTime = (d: Date): string => pad2(d.getHours()) + ":" + pad2(d.getMinutes()) + ":" + pad2(d.getSeconds());

// (6.10.8.1) predefined macros - intercepted by name before ever consulting the macro
// table, so a program accidentally #define-ing one of these (itself undefined behavior
// per 6.10.8.1p2) can't actually change what they expand to. __LINE__/__FILE__ resolve
// against the *token's own* position, which is what makes them track the real current
// line (and any #line override) rather than a value fixed once at #define time.
const PREDEFINED_MACROS: Record<string, (at: PPToken, ctx: ExpansionContext) => PPToken> = {
  __LINE__: (at, ctx) => makeToken(PPTokenKind.PPNumber, String(ctx.map.resolve(at.start).line), at),
  __FILE__: (at, ctx) =>
    makeToken(PPTokenKind.StringLiteral, quoteString(ctx.map.resolve(at.start).file ?? ""), at),
  __DATE__: (at, ctx) => makeToken(PPTokenKind.StringLiteral, quoteString(formatDate(ctx.now)), at),
  __TIME__: (at, ctx) => makeToken(PPTokenKind.StringLiteral, quoteString(formatTime(ctx.now)), at),
  __STDC__: (at) => makeToken(PPTokenKind.PPNumber, "1", at),
  __STDC_VERSION__: (at) => makeToken(PPTokenKind.PPNumber, "201710L", at),
};

// (6.10.9) the _Pragma(string-literal) operator - recognized anywhere in the token
// stream (not just at the start of a line, unlike #pragma) and, like every #pragma
// this interpreter sees, treated as an unconditional no-op: it contributes nothing to
// the output at all. Only the shape is validated; the destringized content is never
// actually interpreted, since no pragma has distinct semantics here yet.
const validatePragmaOperand = (rest: readonly HSToken[]): void => {
  const arg = rest[2];
  if (arg === undefined || arg.token.kind !== PPTokenKind.StringLiteral)
    throw new PreprocessorError(
      { line: rest[0].token.line, column: 1, file: null },
      "the _Pragma operator requires a single string literal argument",
    );
  if (rest[3] === undefined || rest[3].token.text !== ")")
    throw new PreprocessorError(
      { line: rest[0].token.line, column: 1, file: null },
      "missing ')' after _Pragma(...)'s argument",
    );
};

const paramIndex = (
  name: string,
  parameters: readonly string[],
  isVariadic: boolean,
): number => {
  const idx = parameters.indexOf(name);
  if (idx !== -1) return idx;
  if (isVariadic && name === "__VA_ARGS__") return parameters.length;
  return -1;
};

// (6.10.3.1) substitutes parameters into a macro's replacement list, handling the
// '#'/'##' operators before ordinary substitution, then applies HS to every
// produced token - this is where a fresh expansion's hide set actually takes effect.
const subst = (
  IS: readonly HSToken[],
  macro: MacroDefinition,
  AP: readonly HSToken[][],
  HS: ReadonlySet<string>,
  table: MacroTable,
  ctx: ExpansionContext,
): HSToken[] => {
  let OS: HSToken[] = [];
  let i = 0;
  const arg = (idx: number): HSToken[] => AP[idx] ?? [];
  const isParam = (t: HSToken): number =>
    t.token.kind === PPTokenKind.Identifier
      ? paramIndex(t.token.text, macro.parameters, macro.isVariadic)
      : -1;
  const errPos = (t: HSToken): SourcePosition => ({
    line: t.token.line,
    column: 1,
    file: null,
  });

  while (i < IS.length) {
    const cur = IS[i];
    const next: HSToken | undefined = IS[i + 1];

    if (cur.token.kind === PPTokenKind.Punctuator && cur.token.text === "#" && next !== undefined) {
      const pIdx = isParam(next);
      if (pIdx !== -1) {
        OS.push(stringize(arg(pIdx), next.token));
        i += 2;
        continue;
      }
    }

    if (cur.token.text === "##" && next !== undefined) {
      const pIdx = isParam(next);
      if (pIdx !== -1) {
        const a = arg(pIdx);
        if (a.length > 0) OS = glue(OS, a[0], errPos(cur)).concat(a.slice(1));
        i += 2;
        continue;
      }
      OS = glue(OS, next, errPos(cur));
      i += 2;
      continue;
    }

    const curParamIdx = isParam(cur);
    if (curParamIdx !== -1 && next !== undefined && next.token.text === "##") {
      OS = OS.concat(arg(curParamIdx));
      i += 1;
      continue;
    }

    if (curParamIdx !== -1) {
      OS = OS.concat(expand(arg(curParamIdx), table, ctx));
      i += 1;
      continue;
    }

    OS = OS.concat([cur]);
    i += 1;
  }

  return hsadd(HS, OS);
};

interface ScannedArguments {
  args: HSToken[][];
  afterIdx: number;
  closeParenHideSet: ReadonlySet<string>;
}

// scans a function-like macro's actual arguments, splitting on top-level commas
// (nested parentheses protect their own commas) - variadic tail-joining happens
// separately in expand(), once the macro's own named-parameter count is known.
const scanArguments = (
  rest: readonly HSToken[],
  startIdx: number,
  macroNameToken: PPToken,
): ScannedArguments => {
  const args: HSToken[][] = [];
  let current: HSToken[] = [];
  let depth = 1;
  let i = startIdx;
  for (;;) {
    if (i >= rest.length)
      throw new PreprocessorError(
        { line: macroNameToken.line, column: 1, file: null },
        "unterminated invocation of macro '" + macroNameToken.text + "', missing ')'",
      );
    const tok = rest[i];
    if (tok.token.kind === PPTokenKind.Punctuator && tok.token.text === "(") {
      depth++;
      current.push(tok);
      i++;
      continue;
    }
    if (tok.token.kind === PPTokenKind.Punctuator && tok.token.text === ")") {
      depth--;
      if (depth === 0) {
        args.push(current);
        return { args, afterIdx: i + 1, closeParenHideSet: tok.hideSet };
      }
      current.push(tok);
      i++;
      continue;
    }
    if (tok.token.kind === PPTokenKind.Punctuator && tok.token.text === "," && depth === 1) {
      args.push(current);
      current = [];
      i++;
      continue;
    }
    current.push(tok);
    i++;
  }
};

const joinVariadicTail = (
  rawArgs: readonly HSToken[][],
  namedCount: number,
  isVariadic: boolean,
  at: PPToken,
): HSToken[][] => {
  if (!isVariadic) return rawArgs.slice();
  if (rawArgs.length <= namedCount) return [...rawArgs, []];
  const named = rawArgs.slice(0, namedCount);
  const tail = rawArgs.slice(namedCount);
  const comma: HSToken = {
    token: {
      kind: PPTokenKind.Punctuator,
      text: ",",
      start: at.start,
      end: at.start,
      line: at.line,
      hasLeadingWhitespace: false,
    },
    hideSet: EMPTY_SET,
  };
  const joined: HSToken[] = [];
  tail.forEach((slot, idx) => {
    if (idx > 0) joined.push(comma);
    joined.push(...slot);
  });
  return [...named, joined];
};

/**
 * Expands macro invocations in `input` against `table`, rescanning freshly
 * substituted tokens together with whatever follows them - prepending expansion
 * results back onto the front of the work queue is what makes this correctly
 * compositional (one macro's expansion opening a call to another "for free") and
 * what the blue-paint/hide-set check (`t.hideSet.has(name)`) needs to see.
 */
export const expand = (input: readonly HSToken[], table: MacroTable, ctx: ExpansionContext): HSToken[] => {
  const output: HSToken[] = [];
  let rest: HSToken[] = input.slice();

  while (rest.length > 0) {
    const t = rest[0];

    if (t.token.kind !== PPTokenKind.Identifier) {
      output.push(t);
      rest = rest.slice(1);
      continue;
    }

    const name = t.token.text;
    if (t.hideSet.has(name)) {
      output.push(t);
      rest = rest.slice(1);
      continue;
    }

    const predefined = PREDEFINED_MACROS[name];
    if (predefined !== undefined) {
      output.push({ token: predefined(t.token, ctx), hideSet: t.hideSet });
      rest = rest.slice(1);
      continue;
    }

    if (name === "_Pragma" && rest[1]?.token.kind === PPTokenKind.Punctuator && rest[1].token.text === "(") {
      validatePragmaOperand(rest);
      rest = rest.slice(4); // _Pragma(...) always contributes zero output tokens
      continue;
    }

    const macro = table.get(name);
    if (macro === undefined) {
      output.push(t);
      rest = rest.slice(1);
      continue;
    }

    if (!macro.isFunctionLike) {
      const resultHS = union(t.hideSet, new Set([name]));
      const substituted = subst(withFreshHideSets(macro.replacement), macro, [], resultHS, table, ctx);
      rest = substituted.concat(rest.slice(1));
      continue;
    }

    const open = rest[1];
    if (open === undefined || open.token.kind !== PPTokenKind.Punctuator || open.token.text !== "(") {
      // a function-like macro name not followed by '(' is simply never expanded (6.10.3p10).
      output.push(t);
      rest = rest.slice(1);
      continue;
    }

    const { args: rawArgs, afterIdx, closeParenHideSet } = scanArguments(rest, 2, t.token);
    const namedCount = macro.parameters.length;
    const providedCount =
      namedCount === 0 && !macro.isVariadic && rawArgs.length === 1 && rawArgs[0].length === 0
        ? 0
        : rawArgs.length;
    if (macro.isVariadic ? providedCount < namedCount : providedCount !== namedCount) {
      throw new PreprocessorError(
        { line: t.token.line, column: 1, file: null },
        "macro '" + name + "' invoked with " + providedCount + " argument(s), expected " +
          (macro.isVariadic ? "at least " + namedCount : String(namedCount)),
      );
    }

    const args = joinVariadicTail(rawArgs, namedCount, macro.isVariadic, t.token);
    const resultHS = union(intersect(t.hideSet, closeParenHideSet), new Set([name]));
    const substituted = subst(withFreshHideSets(macro.replacement), macro, args, resultHS, table, ctx);
    rest = substituted.concat(rest.slice(afterIdx));
  }

  return output;
};
