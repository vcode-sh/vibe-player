import type { VibePlayerSource } from "./vibe-player-source-types";
import type {
  VibePlayerWatchedRange,
  VibePlayerWatchedRangesReason,
  VibePlayerWatchedRangesReport,
} from "./vibe-player-watched-ranges";

/** A batch holds at most this many separate ranges, bounding memory. */
const VIBE_PLAYER_WATCHED_RANGES_LIMIT = 64;

/** Watched ranges not yet reported, with the source they played from. */
export class VibePlayerWatchedBatch {
  /** Media duration in seconds once known, else 0. */
  duration = 0;
  source: VibePlayerSource | null = null;
  private ranges: VibePlayerWatchedRange[] = [];
  private readonly emit: (report: VibePlayerWatchedRangesReport) => void;

  constructor(emit: (report: VibePlayerWatchedRangesReport) => void) {
    this.emit = emit;
  }

  /** Reports the pending ranges, if any, and starts an empty batch. */
  deliver(reason: VibePlayerWatchedRangesReason): void {
    const { ranges, source } = this;
    if (!(source && ranges.length > 0)) {
      return;
    }
    this.ranges = [];
    this.emit({
      duration: this.duration,
      provider: source.type,
      ranges,
      reason,
      sourceId: source.id,
    });
  }

  /** Merges `start..end` into the sorted, non-overlapping batch. */
  add(start: number, end: number): void {
    let merged = { end, start };
    const next: VibePlayerWatchedRange[] = [];
    for (const range of this.ranges) {
      if (range.end < merged.start || range.start > merged.end) {
        next.push(range);
      } else {
        merged = {
          end: Math.max(range.end, merged.end),
          start: Math.min(range.start, merged.start),
        };
      }
    }
    if (next.length >= VIBE_PLAYER_WATCHED_RANGES_LIMIT) {
      // A new separate range would exceed the bound: deliver the full batch.
      this.deliver("limit");
      this.ranges = [merged];
      return;
    }
    next.push(merged);
    this.ranges = next.sort((a, b) => a.start - b.start);
  }
}
