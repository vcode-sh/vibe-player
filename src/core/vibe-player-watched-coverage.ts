import type { VibePlayerWatchedRange } from "./vibe-player-watched-ranges";

/** Separate spans one playback counts. */
const COVERAGE_RANGE_LIMIT = 256;

/**
 * Adds `start..end` to sorted, non-overlapping ranges, merging every range
 * it overlaps or touches. Returns new ranges, sorted by start.
 */
export function insertVibePlayerWatchedRange(
  ranges: readonly VibePlayerWatchedRange[],
  start: number,
  end: number
): VibePlayerWatchedRange[] {
  let merged = { end, start };
  const next: VibePlayerWatchedRange[] = [];
  for (const range of ranges) {
    if (range.end < merged.start || range.start > merged.end) {
      next.push(range);
    } else {
      merged = {
        end: Math.max(range.end, merged.end),
        start: Math.min(range.start, merged.start),
      };
    }
  }
  next.push(merged);
  return next.sort((a, b) => a.start - b.start);
}

/**
 * The media one playback watched, counted once however often it replays.
 * Memory stays bounded: past the range limit, a new separate span is not
 * counted, so coverage never overstates what played.
 */
export class VibePlayerWatchedCoverage {
  private ranges: VibePlayerWatchedRange[] = [];
  private total = 0;

  /** Unique seconds watched in this playback. */
  get seconds(): number {
    return this.total;
  }

  add(start: number, end: number): void {
    const next = insertVibePlayerWatchedRange(this.ranges, start, end);
    if (next.length > COVERAGE_RANGE_LIMIT) {
      return;
    }
    this.ranges = next;
    this.total = 0;
    for (const range of next) {
      this.total += range.end - range.start;
    }
  }

  reset(): void {
    this.ranges = [];
    this.total = 0;
  }
}
