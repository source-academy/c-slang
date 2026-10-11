/**
 * Tracks where text that has gone through preprocessing transformations (line splicing,
 * later: macro expansion, #include splicing) actually came from in the source the student
 * wrote, so diagnostics can report a position they'd recognize instead of one inside
 * generated text.
 */
export interface SourcePosition {
  line: number; // 1-based
  column: number; // 1-based
  file: string | null;
}

const buildLineStarts = (text: string): number[] => {
  const starts = [0];
  for (let i = 0; i < text.length; i++) {
    if (text[i] === "\n") starts.push(i + 1);
  }
  return starts;
};

const resolveLineColumn = (
  lineStarts: number[],
  offset: number,
): { line: number; column: number } => {
  let lo = 0;
  let hi = lineStarts.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (lineStarts[mid] <= offset) lo = mid;
    else hi = mid - 1;
  }
  return { line: lo + 1, column: offset - lineStarts[lo] + 1 };
};

// (6.10.4) one #line directive's effect: starting from `physicalLine` (the real,
// unspliced original-text line right after the directive itself), every following
// physical line is presented as `presentedLine + (physicalLine offset)` instead of its
// true number, under `file` instead of whatever file was active before. Kept as a
// small list rather than rewriting `originalLineStarts` itself, so multiple #line
// directives (and ones a later directive doesn't override, like an omitted filename
// carrying the previous one forward) all stay correct independently of each other.
interface LineDirective {
  physicalLine: number;
  presentedLine: number;
  file: string | null;
}

/**
 * `logicalToOriginal[i]` is the offset in the original text that logical-text character
 * `i` came from; it has one extra trailing entry (one past the last real character) so
 * resolving an end-exclusive span's end offset, or EOF, still works.
 */
export class PositionMap {
  private readonly originalLineStarts: number[];
  private readonly lineDirectives: LineDirective[] = [];

  constructor(
    private readonly originalText: string,
    private readonly logicalToOriginal: readonly number[],
    private readonly file: string | null = null,
  ) {
    this.originalLineStarts = buildLineStarts(originalText);
  }

  private rawLine(logicalOffset: number): number {
    const clamped = Math.max(0, Math.min(logicalOffset, this.logicalToOriginal.length - 1));
    const originalOffset = this.logicalToOriginal[clamped];
    return resolveLineColumn(this.originalLineStarts, originalOffset).line;
  }

  /** Registers a #line directive found at `atLogicalOffset` (anywhere on its own
   * line) - takes effect starting on the physical line right after it, per 6.10.4p1.
   * Omitting `file` carries forward whichever file was already active. */
  addLineDirective(atLogicalOffset: number, presentedLine: number, file: string | null): void {
    const previousFile = this.lineDirectives[this.lineDirectives.length - 1]?.file ?? this.file;
    this.lineDirectives.push({
      physicalLine: this.rawLine(atLogicalOffset) + 1,
      presentedLine,
      file: file ?? previousFile,
    });
  }

  private activeDirectiveFor(physicalLine: number): LineDirective | undefined {
    let result: LineDirective | undefined;
    for (const d of this.lineDirectives) {
      if (d.physicalLine <= physicalLine) result = d;
    }
    return result;
  }

  resolve(logicalOffset: number): SourcePosition {
    const clamped = Math.max(
      0,
      Math.min(logicalOffset, this.logicalToOriginal.length - 1),
    );
    const originalOffset = this.logicalToOriginal[clamped];
    const { line, column } = resolveLineColumn(
      this.originalLineStarts,
      originalOffset,
    );
    const directive = this.activeDirectiveFor(line);
    if (directive === undefined) return { line, column, file: this.file };
    return {
      line: directive.presentedLine + (line - directive.physicalLine),
      column,
      file: directive.file,
    };
  }
}
