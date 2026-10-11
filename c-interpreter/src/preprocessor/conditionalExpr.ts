import { PPToken, PPTokenKind } from "./ppLexer";
import { PreprocessorError } from "./errors";
import { SourcePosition } from "./position";
import { MacroTable } from "./macroTable";
import { expand, withFreshHideSets } from "./expand";
import { ExpansionContext } from "./context";

// BigInt literal syntax (0n) needs an ES2020+ target; this codebase targets ES6, so
// bigints are built with the BigInt() function everywhere else too (see constants.ts).
const ZERO = BigInt(0);
const ONE = BigInt(1);

const makeNumberToken = (text: string, at: PPToken): PPToken => ({
  kind: PPTokenKind.PPNumber,
  text,
  start: at.start,
  end: at.end,
  line: at.line,
  hasLeadingWhitespace: at.hasLeadingWhitespace,
});

// (6.10.1p1) 'defined' is not itself a macro, and its operand must not be
// macro-expanded - handled as a dedicated pass before ordinary expansion ever
// sees the rest of the controlling expression.
const stripDefined = (
  tokens: readonly PPToken[],
  table: MacroTable,
  pos: SourcePosition,
): PPToken[] => {
  const out: PPToken[] = [];
  let i = 0;
  while (i < tokens.length) {
    const t = tokens[i];
    if (t.kind === PPTokenKind.Identifier && t.text === "defined") {
      let j = i + 1;
      const parenthesized = tokens[j]?.kind === PPTokenKind.Punctuator && tokens[j]?.text === "(";
      if (parenthesized) j++;
      const nameTok = tokens[j];
      if (nameTok === undefined || nameTok.kind !== PPTokenKind.Identifier)
        throw new PreprocessorError(pos, "operand of 'defined' must be an identifier");
      j++;
      if (parenthesized) {
        if (tokens[j]?.text !== ")")
          throw new PreprocessorError(pos, "missing ')' after 'defined('");
        j++;
      }
      out.push(makeNumberToken(table.isDefined(nameTok.text) ? "1" : "0", t));
      i = j;
      continue;
    }
    out.push(t);
    i++;
  }
  return out;
};

// pp-numbers are deliberately loose (6.4.8); here we need an actual integer value, so
// anything that isn't a plain decimal/octal/hex integer (floats, bad suffixes) is
// rejected rather than silently misparsed - matches 6.10.1's "no floating constants".
const parsePPInteger = (text: string, pos: SourcePosition): bigint => {
  const m = /^(0[xX][0-9a-fA-F]+|0[0-7]*|[1-9][0-9]*)([uUlL]*)$/.exec(text);
  if (m === null)
    throw new PreprocessorError(pos, "'" + text + "' is not a valid integer constant in a #if expression");
  const digits = m[1];
  if (/^0[xX]/.test(digits)) return BigInt(digits);
  if (/^0[0-7]+$/.test(digits)) {
    const eight = BigInt(8);
    let v = ZERO;
    for (const ch of digits.slice(1)) v = v * eight + BigInt(ch);
    return v;
  }
  return BigInt(digits); // "0", or an ordinary decimal constant
};

const ESCAPES: Record<string, number> = {
  n: 10, t: 9, r: 13, a: 7, b: 8, f: 12, v: 11,
  "\\": 92, "'": 39, '"': 34, "?": 63,
};

const parseCharConstant = (t: PPToken): bigint => {
  const inner = t.text.slice(1, -1);
  let i = 0;
  if (inner[i] !== "\\") return BigInt(inner.charCodeAt(i));
  i++;
  const c = inner[i];
  if (c !== undefined && c in ESCAPES) return BigInt(ESCAPES[c]);
  if (c === "x") {
    i++;
    let hex = "";
    while (i < inner.length && /[0-9a-fA-F]/.test(inner[i])) hex += inner[i++];
    return BigInt(parseInt(hex || "0", 16));
  }
  if (c !== undefined && c >= "0" && c <= "7") {
    let oct = "";
    while (i < inner.length && oct.length < 3 && inner[i] >= "0" && inner[i] <= "7") oct += inner[i++];
    return BigInt(parseInt(oct, 8));
  }
  return BigInt(c !== undefined ? c.charCodeAt(0) : 0);
};

const BIN_PREC: Record<string, number> = {
  "*": 10, "/": 10, "%": 10,
  "+": 9, "-": 9,
  "<<": 8, ">>": 8,
  "<": 7, ">": 7, "<=": 7, ">=": 7,
  "==": 6, "!=": 6,
  "&": 5,
  "^": 4,
  "|": 3,
  "&&": 2,
  "||": 1,
};

/**
 * A small, dedicated integer-only constant-expression evaluator (6.10.1) over
 * intmax_t-ish bigint arithmetic - deliberately not A9's deferred, full
 * language-level ConstantExpression work, since #if has no real type system,
 * casts, enums, or identifiers-as-values to resolve.
 */
const evaluateExpression = (tokens: readonly PPToken[], pos: SourcePosition): bigint => {
  let i = 0;
  const peek = (): PPToken | undefined => tokens[i];
  const err = (msg: string): never => {
    throw new PreprocessorError(pos, msg);
  };

  const bool = (v: boolean): bigint => (v ? ONE : ZERO);

  const applyBin = (op: string, l: bigint, r: bigint): bigint => {
    switch (op) {
      case "*": return l * r;
      case "/": if (r === ZERO) return err("division by zero in #if expression"); return l / r;
      case "%": if (r === ZERO) return err("division by zero in #if expression"); return l % r;
      case "+": return l + r;
      case "-": return l - r;
      case "<<": return l << r;
      case ">>": return l >> r;
      case "<": return bool(l < r);
      case ">": return bool(l > r);
      case "<=": return bool(l <= r);
      case ">=": return bool(l >= r);
      case "==": return bool(l === r);
      case "!=": return bool(l !== r);
      case "&": return l & r;
      case "^": return l ^ r;
      case "|": return l | r;
      case "&&": return bool(l !== ZERO && r !== ZERO);
      case "||": return bool(l !== ZERO || r !== ZERO);
      default: return err("internal error: unknown operator '" + op + "'");
    }
  };

  const parsePrimary = (): bigint => {
    const t = peek();
    if (t === undefined) return err("expected an expression");
    if (t.kind === PPTokenKind.Punctuator && t.text === "(") {
      i++;
      const v = parseTernary();
      if (peek()?.text !== ")") return err("expected ')'");
      i++;
      return v;
    }
    if (t.kind === PPTokenKind.PPNumber) {
      i++;
      return parsePPInteger(t.text, pos);
    }
    if (t.kind === PPTokenKind.CharacterConstant) {
      i++;
      return parseCharConstant(t);
    }
    return err("expected a constant expression, found '" + t.text + "'");
  };

  const parseUnary = (): bigint => {
    const t = peek();
    if (t?.kind === PPTokenKind.Punctuator && ["!", "~", "-", "+"].includes(t.text)) {
      i++;
      const v = parseUnary();
      if (t.text === "!") return bool(v === ZERO);
      if (t.text === "~") return ~v;
      if (t.text === "-") return -v;
      return v;
    }
    return parsePrimary();
  };

  const parseBinary = (minPrec: number): bigint => {
    let left = parseUnary();
    for (;;) {
      const t = peek();
      if (t === undefined || t.kind !== PPTokenKind.Punctuator) break;
      const prec = BIN_PREC[t.text];
      if (prec === undefined || prec < minPrec) break;
      i++;
      const right = parseBinary(prec + 1);
      left = applyBin(t.text, left, right);
    }
    return left;
  };

  const parseTernary = (): bigint => {
    const cond = parseBinary(1);
    if (peek()?.text === "?") {
      i++;
      const thenV = parseTernary();
      if (peek()?.text !== ":") return err("expected ':' in '?:' expression");
      i++;
      const elseV = parseTernary();
      return cond !== ZERO ? thenV : elseV;
    }
    return cond;
  };

  const result = parseTernary();
  if (i < tokens.length) err("unexpected token '" + tokens[i].text + "' in #if expression");
  return result;
};

/**
 * The full 6.10.1 pipeline for a #if/#elif controlling expression: resolve 'defined'
 * first (shielding its operand from expansion), macro-expand what's left, replace any
 * identifier still standing with 0 (6.10.1p4), then evaluate as a constant expression.
 */
export const evaluateControllingExpression = (
  tokens: readonly PPToken[],
  pos: SourcePosition,
  table: MacroTable,
  ctx: ExpansionContext,
): bigint => {
  if (tokens.length === 0) throw new PreprocessorError(pos, "#if with no expression");
  const afterDefined = stripDefined(tokens, table, pos);
  const expanded = expand(withFreshHideSets(afterDefined), table, ctx).map((h) => h.token);
  const resolved = expanded.map((t) =>
    t.kind === PPTokenKind.Identifier ? makeNumberToken("0", t) : t,
  );
  return evaluateExpression(resolved, pos);
};
