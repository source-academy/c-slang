import { TypedExpression } from "../ast/types";
import { describeObjectAt } from "../memory/explainFault";
import { mayAccessMemory, mayHaveSideEffects } from "../analysis/effects";
import { UnsequencedAccessError } from "./errors";
import { SourceSpan, spanOf } from "./notes";
import type { Runtime } from "./runtime";

export type GroupKind = "binary" | "assignment" | "call" | "initializer";

export interface OperandPosition {
  node: TypedExpression;
  // Agenda positions: the operand's own item, and just below its last item.
  slot: number;
  end: number;
}

interface Access {
  start: number; // [start, end); standard output is [-1, 0)
  end: number;
  write: boolean;
  depth: number;
  serial: number;
}

interface Operand {
  span: SourceSpan;
  slot: number;
  end: number;
  accesses: Map<string, Access>;
}

interface Group {
  kind: GroupKind;
  op: string;
  operands: Operand[];
  depth: number;
  serial: number;
  parent: Target | null;
  started: number; // operands whose slot has been reached
  current: number | null; // operand in progress
}

interface Target {
  group: Group;
  operand: Operand;
}

interface Conflict {
  i: number;
  j: number;
  a: Access;
  b: Access;
  start: number;
  end: number;
  unsequenced: boolean;
}

const CLAUSE: Record<GroupKind, string> = {
  binary: "6.5p3",
  assignment: "6.5.16p3",
  call: "6.5.2.2p10",
  initializer: "6.7.9p23",
};

const label = (kind: GroupKind, k: number): string => {
  switch (kind) {
    case "call":
      return `argument ${k + 1}`;
    case "initializer":
      return `element ${k + 1}`;
    default:
      return k === 0 ? "the left operand" : "the right operand";
  }
};

// B4.5: records what each operand of an order-open construct reads and
// writes, by agenda position, and classifies conflicts when the construct's
// own operation runs. Operands are unsequenced as wholes (C17 6.5p3), so a
// conflict made entirely at the group's own call depth is UB (6.5p2); one
// that goes through a call is only unspecified (6.5.2.2p10), as is any
// conflict between initializer-list elements (6.7.9p23).
export class EvaluationOrderTracker {
  private readonly groups: Group[] = [];
  private target: Target | null = null;

  constructor(private readonly rt: Runtime) {}

  // Without explicit positions the operands occupy the top agenda positions,
  // first on top, as every construct but an initializer list pushes them.
  open(
    kind: GroupKind,
    op: string,
    nodes: TypedExpression[],
    designation = -1,
    positions?: OperandPosition[],
  ): void {
    const effects = nodes.map((node) => mayHaveSideEffects(node));
    const access = nodes.map((node, k) => mayAccessMemory(node, k === designation));
    if (!effects.some((e, i) => e && access.some((a, j) => a && j !== i))) return;
    const size = this.rt.agenda.size();
    const operands =
      positions ?? nodes.map((node, k) => ({ node, slot: size - k, end: size - k - 1 }));
    this.groups.push({
      kind,
      op,
      operands: operands.map(({ node, slot, end }) => ({
        span: spanOf(node),
        slot,
        end,
        accesses: new Map(),
      })),
      depth: this.depth(),
      serial: this.rt.memory.storage.serial,
      parent: this.target,
      started: 0,
      current: null,
    });
  }

  // Called with the agenda size before each step: the item about to run sits
  // at that position. An operand starts when its own item runs and lasts
  // until the position falls to its end; a group closes once execution
  // reaches its operation, below its last operand. Only the innermost group
  // can change state: an outer group's next operand sits below everything
  // the inner one does, so between operands the enclosing operand (captured
  // at open) is the target.
  beforeStep(position: number): void {
    if (this.groups.length === 0) return;
    while (this.groups.length) {
      const group = this.groups[this.groups.length - 1];
      if (position > group.operands[group.operands.length - 1].end) break;
      this.groups.pop();
      this.close(group);
    }
    const group = this.groups[this.groups.length - 1];
    if (!group) {
      this.target = null;
      return;
    }
    const next = group.operands[group.started];
    if (next && position === next.slot) group.current = group.started++;
    else if (group.current !== null && position <= group.operands[group.current].end)
      group.current = null;
    this.target =
      group.current !== null ? { group, operand: group.operands[group.current] } : group.parent;
  }

  record(address: number, size: number, write: boolean): void {
    if (!this.target) return;
    const range = this.rt.memory.storage.findAt(address, size);
    if (!range || range.serial === undefined) return;
    this.add(this.target.operand, {
      start: address,
      end: address + size,
      write,
      depth: this.depth(),
      serial: range.serial,
    });
  }

  recordOutput(): void {
    if (!this.target) return;
    this.add(this.target.operand, { start: -1, end: 0, write: true, depth: this.depth(), serial: 0 });
  }

  private add(operand: Operand, access: Access): void {
    const key = `${access.start}:${access.end}:${access.write}:${access.depth}:${access.serial}`;
    if (!operand.accesses.has(key)) operand.accesses.set(key, access);
  }

  private depth(): number {
    return this.rt.functionCalls.size() + this.rt.builtinDepth;
  }

  private close(group: Group): void {
    const conflict = this.findConflict(group);
    // The enclosing operand saw everything this group did.
    if (group.parent)
      for (const operand of group.operands)
        for (const access of operand.accesses.values()) this.add(group.parent.operand, access);
    if (conflict) this.report(group, conflict);
  }

  // Prefers unsequenced (UB) over unspecified, and write/write over write/read.
  private findConflict(group: Group): Conflict | null {
    const ops = group.operands;
    const rank = (c: Conflict) => (c.unsequenced ? 2 : 0) + (c.a.write && c.b.write ? 1 : 0);
    let best: Conflict | null = null;
    for (let i = 0; i < ops.length; i++)
      for (let j = i + 1; j < ops.length; j++)
        for (const a of ops[i].accesses.values()) {
          if (a.serial > group.serial) continue;
          for (const b of ops[j].accesses.values()) {
            if (b.serial > group.serial || !(a.write || b.write)) continue;
            if (!(a.start < b.end && b.start < a.end)) continue;
            const unsequenced =
              group.kind !== "initializer" && a.depth === group.depth && b.depth === group.depth;
            const c = { i, j, a, b, start: Math.max(a.start, b.start), end: Math.min(a.end, b.end), unsequenced };
            if (rank(c) === 3) return c;
            if (!best || rank(c) > rank(best)) best = c;
          }
        }
    return best;
  }

  private report(group: Group, c: Conflict): void {
    const { kind, op, operands } = group;
    const src = (k: number) => "`" + operands[k].span.src.trim() + "`";
    const object = c.start < 0 ? "standard output" : describeObjectAt(c.start, c.end - c.start, this.rt.memory);
    const [w, r] = c.a.write ? [c.i, c.j] : [c.j, c.i];
    const both = c.a.write && c.b.write;

    if (c.unsequenced) {
      const how = both
        ? `is modified by both ${src(c.i)} and ${src(c.j)}`
        : `is modified by ${src(w)} and read by ${src(r)}`;
      throw new UnsequencedAccessError(
        `${object} ${how} in the same expression with no sequence point between them (C17 6.5p2)`,
      );
    }

    let intro: string;
    switch (kind) {
      case "call":
        intro = `C17 leaves the order of a call's arguments unspecified (${CLAUSE[kind]}); this interpreter evaluated them left to right`;
        break;
      case "initializer":
        intro = `C17 leaves the order of initializer-list elements unspecified (${CLAUSE[kind]}); this interpreter evaluated them in list order`;
        break;
      default:
        intro = `C17 leaves the order of the operands of \`${op}\` unspecified (${CLAUSE[kind]}); this interpreter evaluated the left operand ${src(0)} first`;
    }
    const outcome =
      c.start < 0
        ? `${label(kind, c.i)} ${src(c.i)} and ${label(kind, c.j)} ${src(c.j)} both printed output, so the printed order depends on this choice`
        : both
          ? `${label(kind, c.i)} ${src(c.i)} and ${label(kind, c.j)} ${src(c.j)} both modified ${object}, so another compiler can give a different result`
          : `${label(kind, w)} ${src(w)} modified ${object} and ${label(kind, r)} ${src(r)} read it, so another compiler can give a different result`;
    this.rt.note({
      kind: "unspecified-order",
      phase: "runtime",
      clause: "C17 " + CLAUSE[kind],
      message: `${intro}; ${outcome}.`,
      ranges: [operands[c.i].span, operands[c.j].span],
    });
  }
}
