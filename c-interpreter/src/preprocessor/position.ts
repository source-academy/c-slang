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

/**
 * `logicalToOriginal[i]` is the offset in the original text that logical-text character
 * `i` came from; it has one extra trailing entry (one past the last real character) so
 * resolving an end-exclusive span's end offset, or EOF, still works.
 */
export class PositionMap {
  private readonly originalLineStarts: number[];

  constructor(
    private readonly originalText: string,
    private readonly logicalToOriginal: readonly number[],
    private readonly file: string | null = null,
  ) {
    this.originalLineStarts = buildLineStarts(originalText);
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
    return { line, column, file: this.file };
  }
}
