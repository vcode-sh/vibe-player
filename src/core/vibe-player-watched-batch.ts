import type { VibePlayerSource } from "./vibe-player-source-types";
import { insertVibePlayerWatchedRange } from "./vibe-player-watched-coverage";
import type {
  VibePlayerWatchedRange,
  VibePlayerWatchedRangesReason,
  VibePlayerWatchedRangesReport,
} from "./vibe-player-watched-ranges";

/** A batch holds at most this many separate ranges, bounding memory. */
const VIBE_PLAYER_WATCHED_RANGES_LIMIT = 64;

/** Watched ranges not yet reported, and the playback they belong to. */
export class VibePlayerWatchedBatch {
  /** Media duration in seconds once known, else 0. */
  duration = 0;
  source: VibePlayerSource | null = null;
  private playbackId = "";
  private ranges: VibePlayerWatchedRange[] = [];
  private sequence = 0;
  private readonly emit: (report: VibePlayerWatchedRangesReport) => void;

  constructor(emit: (report: VibePlayerWatchedRangesReport) => void) {
    this.emit = emit;
  }

  /** Later reports belong to `playbackId` and are numbered from 1. */
  begin(playbackId: string): void {
    this.playbackId = playbackId;
    this.sequence = 0;
  }

  /** Reports the pending ranges, when there are some, and empties the batch. */
  deliver(reason: VibePlayerWatchedRangesReason): void {
    const { ranges, source } = this;
    if (!(source && ranges.length > 0)) {
      return;
    }
    this.ranges = [];
    this.sequence += 1;
    this.emit({
      duration: this.duration,
      playbackId: this.playbackId,
      provider: source.type,
      ranges,
      reason,
      sequence: this.sequence,
      sourceId: source.id,
    });
  }

  /** Merges `start..end` into the sorted, non-overlapping batch. */
  add(start: number, end: number): void {
    const next = insertVibePlayerWatchedRange(this.ranges, start, end);
    if (next.length > VIBE_PLAYER_WATCHED_RANGES_LIMIT) {
      // A new separate range would exceed the bound: deliver the full batch.
      this.deliver("limit");
      this.ranges = [{ end, start }];
      return;
    }
    this.ranges = next;
  }
}
