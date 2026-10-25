import {
  TypedBlockItem,
  TypedExpression,
  TypedInitializer,
  TypedStatement,
  TypedTranslationUnit,
  isTypedCompoundStatement,
  isTypedDeclaration,
  isTypedInitializerList,
  isTypedIterationStatementFor,
  isTypedLabeledStatementCase,
  isTypedLabeledStatementDefault,
  isTypedSelectionStatementIf,
  isTypedSelectionStatementSwitch,
  isTypedefDeclaration,
} from "../ast/types";
import { isArray, isFunction } from "../typing/types";
import { NoteSpec, SourceSpan, spanOf } from "../interpreter/notes";

// B4.6: flags expressions that modify a scalar object and also modify or
// read it with no sequence point in between (C17 6.5p2), before the program
// runs. Objects are named syntactically within one full expression (6.8p4):
// `x`, `s.m`, `a[2]`. Accesses through pointers or non-constant subscripts
// have no name and are not tracked (no alias analysis).

interface Site {
  node: SourceSpan;
  conditional: boolean;
}

type Sites = Map<string, Site[]>;

interface Summary {
  // The object this expression designates, when it has a stable name.
  key: string | null;
  reads: Sites;
  writes: Sites;
  // Writes not sequenced before this expression's value is used.
  unsealed: Sites;
}

const empty = (): Sites => new Map();

const add = (sites: Sites, key: string, site: Site): void => {
  const list = sites.get(key);
  if (list) list.push(site);
  else sites.set(key, [site]);
};

const union = (...all: Sites[]): Sites => {
  const out = empty();
  for (const sites of all) for (const [key, list] of sites) for (const s of list) add(out, key, s);
  return out;
};

const conditional = (sites: Sites): Sites => {
  const out = empty();
  for (const [key, list] of sites) for (const s of list) add(out, key, { ...s, conditional: true });
  return out;
};

// `s` and `s.a` name overlapping storage; `s.a` and `s.b` do not.
const overlaps = (a: string, b: string): boolean =>
  a === b || a.startsWith(b + ".") || a.startsWith(b + "[") || b.startsWith(a + ".") || b.startsWith(a + "[");

const leaf = (key: string | null, reads = empty(), writes = empty(), unsealed = empty()): Summary => ({
  key,
  reads,
  writes,
  unsealed,
});

const constantIndex = (e: TypedExpression): string | null =>
  e.type === "PrimaryExprConstant" && typeof e.value !== "string" && e.value.type === "IntegerConstant"
    ? `[${e.value.value}]`
    : null;

export class UnsequencedAnalysis {
  private readonly notes: NoteSpec[] = [];
  private readonly seen = new Set<string>();

  run(tu: TypedTranslationUnit): NoteSpec[] {
    for (const item of tu.value) {
      if (item.type === "FunctionDefinition") this.block(item.body.value);
      else this.blockItem(item);
    }
    return this.notes;
  }

  private block(items: TypedBlockItem[]): void {
    items.forEach((item) => this.blockItem(item));
  }

  private blockItem(item: TypedBlockItem): void {
    if (isTypedefDeclaration(item)) return;
    if (isTypedDeclaration(item)) {
      for (const d of item.declaratorList) if (d.initializer) this.initializer(d.initializer);
      return;
    }
    this.statement(item);
  }

  // Every statement's expressions are full expressions (C17 6.8p4).
  private statement(s: TypedStatement): void {
    if (isTypedCompoundStatement(s)) return this.block(s.value);
    if (isTypedSelectionStatementIf(s)) {
      this.full(s.cond);
      this.statement(s.consequent);
      if (s.alternative) this.statement(s.alternative);
      return;
    }
    if (isTypedSelectionStatementSwitch(s)) {
      this.full(s.controlExpr);
      return this.statement(s.body);
    }
    if (isTypedIterationStatementFor(s)) {
      if (s.init?.type === "Declaration") this.blockItem(s.init);
      else if (s.init) this.full(s.init);
      if (s.controlExpr) this.full(s.controlExpr);
      if (s.afterIterExpr) this.full(s.afterIterExpr);
      return this.statement(s.body);
    }
    if (isTypedLabeledStatementCase(s) || isTypedLabeledStatementDefault(s)) return this.statement(s.body);
    switch (s.type) {
      case "IterationStatementWhile":
      case "IterationStatementDoWhile":
        this.full(s.cond);
        return this.statement(s.body);
      case "ExpressionStatement":
        if (s.value.type !== "EmptyExpressionStatement") this.full(s.value);
        return;
      case "JumpStatementReturn":
        if (s.value) this.full(s.value);
        return;
      default:
        return;
    }
  }

  // Initializer-list elements are indeterminately sequenced (6.7.9p23), so
  // each is its own full expression and none is compared with another.
  private initializer(init: TypedInitializer): void {
    if (isTypedInitializerList(init)) init.value.forEach((entry) => this.initializer(entry.initializer));
    else this.full(init);
  }

  private full(e: TypedExpression): void {
    this.summarize(e, false);
  }

  private report(key: string, write: Site, other: Site, bothWrite: boolean): void {
    const id = [write.node.start.offset, write.node.end.offset, other.node.start.offset, other.node.end.offset].join(":");
    if (this.seen.has(id)) return;
    this.seen.add(id);
    const guard = write.conditional
      ? `if \`${write.node.src.trim()}\` is evaluated, `
      : other.conditional
        ? `if \`${other.node.src.trim()}\` is evaluated, `
        : "";
    const what = bothWrite
      ? `\`${key}\` is modified twice in this expression with no sequence point between the modifications`
      : `\`${key}\` is modified and also read in this expression with no sequence point between them`;
    this.notes.push({
      kind: "unsequenced",
      phase: "static",
      clause: "C17 6.5p2",
      message: `undefined behaviour: ${guard}${what} (C17 6.5p2)`,
      ranges: [write.node, other.node],
    });
  }

  // Operands of one construct that are unsequenced with respect to each
  // other: one report per pair, preferring two modifications over a
  // modification and a read.
  private siblings(a: Summary, b: Summary): void {
    const found: { key: string; write: Site; other: Site; bothWrite: boolean }[] = [];
    for (const [ka, writes] of a.writes) {
      for (const [kb, list] of b.writes)
        if (overlaps(ka, kb))
          for (const w of writes) for (const o of list) found.push({ key: ka, write: w, other: o, bothWrite: true });
      for (const [kb, list] of b.reads)
        if (overlaps(ka, kb))
          for (const w of writes) for (const o of list) found.push({ key: ka, write: w, other: o, bothWrite: false });
    }
    for (const [ka, reads] of a.reads)
      for (const [kb, writes] of b.writes)
        if (overlaps(ka, kb))
          for (const w of writes) for (const r of reads) found.push({ key: kb, write: w, other: r, bothWrite: false });
    const best = found.find((c) => c.bothWrite) ?? found[0];
    if (best) this.report(best.key, best.write, best.other, best.bothWrite);
  }

  private modify(operand: Summary, node: SourceSpan, readsFirst: boolean): Summary {
    const reads = union(operand.reads);
    const writes = union(operand.writes);
    const unsealed = union(operand.unsealed);
    if (operand.key) {
      const site = { node, conditional: false };
      if (readsFirst) add(reads, operand.key, site);
      add(writes, operand.key, site);
      add(unsealed, operand.key, site);
    }
    return leaf(null, reads, writes, unsealed);
  }

  private summarize(e: TypedExpression, asDesignation: boolean): Summary {
    const node = spanOf(e);
    switch (e.type) {
      case "PrimaryExprIdentifier": {
        if (isFunction(e.typeInfo)) return leaf(null);
        const reads = empty();
        // Array-to-pointer conversion doesn't read the array (6.3.2.1p3).
        if (!asDesignation && !isArray(e.typeInfo)) add(reads, e.value, { node, conditional: false });
        return leaf(e.value, reads);
      }
      case "PrimaryExprParenthesis":
        return this.summarize(e.value, asDesignation);
      case "PostfixExpression": {
        const op = e.op;
        switch (op.type) {
          case "ArraySubscripting": {
            const base = this.summarize(e.expr, false);
            const index = this.summarize(op.value, false);
            this.siblings(base, index);
            const idx = constantIndex(op.value);
            const key = base.key !== null && isArray(e.expr.typeInfo) && idx ? base.key + idx : null;
            const reads = union(base.reads, index.reads);
            if (key && !asDesignation && !isArray(e.typeInfo)) add(reads, key, { node, conditional: false });
            return leaf(key, reads, union(base.writes, index.writes), union(base.unsealed, index.unsealed));
          }
          case "StructMember": {
            const base = this.summarize(e.expr, e.expr.lvalue);
            const key = base.key !== null ? base.key + "." + op.value : null;
            const reads = union(base.reads);
            if (key && !asDesignation && !isArray(e.typeInfo)) add(reads, key, { node, conditional: false });
            return leaf(key, reads, base.writes, base.unsealed);
          }
          case "PointerMember": {
            const base = this.summarize(e.expr, false);
            return leaf(null, base.reads, base.writes, base.unsealed);
          }
          case "FunctionCall": {
            const parts = [this.summarize(e.expr, false), ...op.value.map((arg) => this.summarize(arg, false))];
            for (let i = 0; i < parts.length; i++)
              for (let j = i + 1; j < parts.length; j++) this.siblings(parts[i], parts[j]);
            // A sequence point precedes the call (6.5.2.2p10).
            return leaf(null, union(...parts.map((p) => p.reads)), union(...parts.map((p) => p.writes)));
          }
          case "PostfixIncrement":
          case "PostfixDecrement":
            return this.modify(this.summarize(e.expr, true), node, true);
        }
        return leaf(null);
      }
      case "UnaryExpressionIncr":
      case "UnaryExpressionDecr":
        return this.modify(this.summarize(e.value, true), node, true);
      case "UnaryExpression": {
        if (e.op === "&") {
          const operand = this.summarize(e.expr, true);
          return leaf(null, operand.reads, operand.writes, operand.unsealed);
        }
        const operand = this.summarize(e.expr, false);
        return leaf(null, operand.reads, operand.writes, operand.unsealed);
      }
      case "CastExpression": {
        const operand = this.summarize(e.expr, false);
        return leaf(null, operand.reads, operand.writes, operand.unsealed);
      }
      case "BinaryExpr": {
        const left = this.summarize(e.left, false);
        let right = this.summarize(e.right, false);
        if (e.op === "&&" || e.op === "||") {
          right = leaf(null, conditional(right.reads), conditional(right.writes), conditional(right.unsealed));
          return leaf(null, union(left.reads, right.reads), union(left.writes, right.writes), right.unsealed);
        }
        this.siblings(left, right);
        return leaf(
          null,
          union(left.reads, right.reads),
          union(left.writes, right.writes),
          union(left.unsealed, right.unsealed),
        );
      }
      case "ConditionalExpression": {
        const cond = this.summarize(e.cond, false);
        const branches = [e.exprIfTrue, e.exprIfFalse].map((x) => this.summarize(x, false));
        return leaf(
          null,
          union(cond.reads, ...branches.map((b) => conditional(b.reads))),
          union(cond.writes, ...branches.map((b) => conditional(b.writes))),
          union(...branches.map((b) => conditional(b.unsealed))),
        );
      }
      case "CommaOperator": {
        const parts = e.value.map((x) => this.summarize(x, false));
        const last = parts[parts.length - 1];
        return leaf(null, union(...parts.map((p) => p.reads)), union(...parts.map((p) => p.writes)), last.unsealed);
      }
      case "AssignmentExpression": {
        const left = this.summarize(e.left, true);
        const right = this.summarize(e.right, false);
        this.siblings(left, right);
        const reads = union(left.reads, right.reads);
        const writes = union(left.writes, right.writes);
        const unsealed = union(left.unsealed, right.unsealed);
        if (left.key) {
          const store = { node, conditional: false };
          // The store is sequenced after the operands' value computations
          // but not after their side effects (6.5.16p3).
          for (const [key, list] of unsealed)
            if (overlaps(key, left.key)) for (const w of list) this.report(left.key, store, w, true);
          if (e.op !== "=") add(reads, left.key, { node: spanOf(e.left), conditional: false });
          add(writes, left.key, store);
          add(unsealed, left.key, store);
        }
        return leaf(null, reads, writes, unsealed);
      }
      default:
        return leaf(null);
    }
  }
}

export const findUnsequencedConflicts = (tu: TypedTranslationUnit): NoteSpec[] =>
  new UnsequencedAnalysis().run(tu);
