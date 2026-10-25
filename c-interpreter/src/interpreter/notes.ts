import { BaseNode } from "../ast/types";

export type NotePhase = "static" | "runtime";

export type NoteKind =
  | "implementation-defined"
  | "string-literal-identity"
  | "unspecified-order"
  | "unsequenced";

export type SourceSpan = Pick<BaseNode, "start" | "end" | "src">;

// Instructions keep a slim span rather than the node, which RuntimeView
// would otherwise deep-clone on every step.
export const spanOf = ({ start, end, src }: SourceSpan): SourceSpan => ({ start, end, src });

export interface NoteSpec {
  kind: NoteKind;
  phase: NotePhase;
  message: string;
  clause: string;
  ranges: SourceSpan[];
  // Tells apart notes with the same kind and spans (e.g. one per parameter).
  detail?: string;
}

export interface Note extends NoteSpec {
  // Static notes use step 0, before any execution.
  firstStep: number;
  lastStep: number;
  count: number;
}

// Non-fatal diagnostics raised while a program runs (B4.1). Repeats of one
// note (a loop body, a recursive call) merge into a count, so the log stays
// small and a snapshot per step stays cheap.
export class NoteLog {
  private readonly notes: Note[] = [];
  private readonly byKey = new Map<string, Note>();

  add(spec: NoteSpec, step: number): Note {
    const key = [
      spec.kind,
      spec.clause,
      spec.detail ?? "",
      ...spec.ranges.map((r) => r.start.offset + "-" + r.end.offset),
    ].join("|");
    const existing = this.byKey.get(key);
    if (existing) {
      existing.count++;
      existing.lastStep = step;
      return existing;
    }
    const note: Note = { ...spec, firstStep: step, lastStep: step, count: 1 };
    this.notes.push(note);
    this.byKey.set(key, note);
    return note;
  }

  // Copies, so a RuntimeView keeps the counts it was taken with.
  getNotes(): Note[] {
    return this.notes.map((note) => ({ ...note, ranges: [...note.ranges] }));
  }
}
