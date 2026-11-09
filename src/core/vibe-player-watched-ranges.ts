import type { VibePlayerControllerState } from "./vibe-player-controller-types";
import type { VibePlayerSource } from "./vibe-player-source-types";

/** A span of media time, in seconds, that played continuously. */
export interface VibePlayerWatchedRange {
  end: number;
  start: number;
}

/**
 * Why a batch was delivered: the viewer paused or stopped (`pause`), media
 * ended, the source closed or changed (`close`), the page was hidden, the
 * batch reached its range limit, or a seek boundary or host call flushed it.
 */
export type VibePlayerWatchedRangesReason =
  | "close"
  | "ended"
  | "flush"
  | "hidden"
  | "limit"
  | "pause";

/** Watched time since the previous report, for host-owned aggregation. */
export interface VibePlayerWatchedRangesReport {
  /** Media duration in seconds when known, else 0. */
  duration: number;
  provider: VibePlayerSource["type"];
  /** Sorted, merged and non-overlapping; never empty. */
  ranges: readonly VibePlayerWatchedRange[];
  reason: VibePlayerWatchedRangesReason;
  sourceId: string;
}

/** A batch holds at most this many separate ranges, bounding memory. */
const VIBE_PLAYER_WATCHED_RANGES_LIMIT = 64;
/** Timer jitter allowed beyond wall-clock progress before a jump is a seek. */
const jitterSeconds = 1;

interface Sample {
  at: number;
  time: number;
}

/**
 * Turns normalized controller state into watched ranges. Only progress while
 * `readyState` is `playing` counts, and only when media time advanced no
 * faster than the wall clock allows. Seek boundaries keep jumps out of playback.
 */
export class VibePlayerWatchedRangesTracker {
  private duration = 0;
  private last: Sample | null = null;
  private ranges: VibePlayerWatchedRange[] = [];
  private seeking = false;
  private source: VibePlayerSource | null = null;
  private readonly emit: (report: VibePlayerWatchedRangesReport) => void;
  private readonly now: () => number;

  constructor(
    emit: (report: VibePlayerWatchedRangesReport) => void,
    now: () => number = Date.now
  ) {
    this.emit = emit;
    this.now = now;
  }

  update({
    currentSource,
    lastEvent,
    snapshot,
  }: VibePlayerControllerState): void {
    if (currentSource?.id !== this.source?.id) {
      this.flush("close");
      this.last = null;
      this.duration = 0;
    }
    if (currentSource !== this.source) {
      this.seeking = false;
    }
    this.source = currentSource;
    if (Number.isFinite(snapshot.duration) && snapshot.duration > 0) {
      this.duration = snapshot.duration;
    }
    if (this.observeSeek(lastEvent)) {
      return;
    }
    if (this.last) {
      this.advance(snapshot.currentTime, snapshot.playbackRate);
    }
    const startsAfterSeek =
      lastEvent === "seeked" && snapshot.readyState === "buffering";
    if (
      !snapshot.paused &&
      (snapshot.readyState === "playing" || startsAfterSeek)
    ) {
      this.last ??= { at: this.now(), time: snapshot.currentTime };
      return;
    }
    this.last = null;
    if (snapshot.paused) {
      this.flush(snapshot.readyState === "ended" ? "ended" : "pause");
    }
  }

  /** A host seek: the next progress starts a new range. */
  interrupt(): void {
    this.last = null;
  }

  flush(reason: VibePlayerWatchedRangesReason): void {
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

  private observeSeek(
    lastEvent: VibePlayerControllerState["lastEvent"]
  ): boolean {
    if (lastEvent === "seeking") {
      this.flush("flush");
      this.seeking = true;
    } else if (lastEvent === "seeked") {
      this.seeking = false;
    }
    if (this.seeking) {
      this.last = null;
    }
    return this.seeking;
  }

  private advance(time: number, rate: number): void {
    const { last } = this;
    if (!last) {
      return;
    }
    const delta = time - last.time;
    if (delta === 0) {
      return;
    }
    const at = this.now();
    this.last = { at, time };
    const allowed = ((at - last.at) / 1000) * Math.max(1, rate) + jitterSeconds;
    if (delta > 0 && delta <= allowed) {
      this.add(last.time, time);
    }
  }

  private add(start: number, end: number): void {
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
      this.flush("limit");
      this.ranges = [merged];
      return;
    }
    next.push(merged);
    this.ranges = next.sort((a, b) => a.start - b.start);
  }
}
