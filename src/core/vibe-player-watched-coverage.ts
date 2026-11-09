import type { VibePlayerWatchedRange } from "./vibe-player-watched-ranges";

/** Separate spans one playback keeps; more merge the closest neighbors. */
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
 * Memory stays bounded: past the range limit, the two closest spans merge,
 * which can count their small gap as watched.
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
    this.ranges =
      next.length > COVERAGE_RANGE_LIMIT ? mergeClosestRanges(next) : next;
    this.total = 0;
    for (const range of this.ranges) {
      this.total += range.end - range.start;
    }
  }

  reset(): void {
    this.ranges = [];
    this.total = 0;
  }
}

function mergeClosestRanges(
  ranges: readonly VibePlayerWatchedRange[]
): VibePlayerWatchedRange[] {
  let closest = 0;
  for (let index = 1; index < ranges.length - 1; index += 1) {
    if (gapAfter(ranges, index) < gapAfter(ranges, closest)) {
      closest = index;
    }
  }
  const first = ranges[closest];
  const second = ranges[closest + 1];
  if (!(first && second)) {
    return [...ranges];
  }
  return [
    ...ranges.slice(0, closest),
    { end: second.end, start: first.start },
    ...ranges.slice(closest + 2),
  ];
}

function gapAfter(
  ranges: readonly VibePlayerWatchedRange[],
  index: number
): number {
  const range = ranges[index];
  const next = ranges[index + 1];
  return range && next ? next.start - range.end : Number.POSITIVE_INFINITY;
}
