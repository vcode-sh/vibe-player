import type {
  VibePlayerRawFeedEntry,
  VibePlayerRawReleaseReason,
} from "./vibe-player-raw-feed";
import type {
  VibePlayerAdapterEvent,
  VibePlayerEventName,
  VibePlayerSnapshot,
} from "./vibe-player-runtime-types";
import type { VibePlayerSource } from "./vibe-player-source-types";
import { VibePlayerWatchedBatch } from "./vibe-player-watched-batch";
import { VibePlayerWatchedCoverage } from "./vibe-player-watched-coverage";

/** A span of media time, in seconds, that played continuously. */
export interface VibePlayerWatchedRange {
  end: number;
  start: number;
}

/**
 * Why a batch was delivered: the viewer paused or playback stopped
 * (`pause`), media `ended`, a seek started (`seek`), retry or renewal
 * reattached the same source (`reload`), the playback closed because the
 * source closed, changed or loaded again or the media unmounted (`close`),
 * the page was `hidden`, the batch reached its range `limit`, or the host
 * called `flushWatchedRanges()` (`flush`).
 */
export type VibePlayerWatchedRangesReason =
  | "close"
  | "ended"
  | "flush"
  | "hidden"
  | "limit"
  | "pause"
  | "reload"
  | "seek";

/** Watched time since the previous report, for host-owned aggregation. */
export interface VibePlayerWatchedRangesReport {
  /** Media duration in seconds when known, else 0. */
  duration: number;
  /**
   * Identifies one playback: unique within the page, with a random part
   * that makes repeats across pages unlikely. Loading a source (even
   * the same one again) and playing again after `ended` start a new
   * playback; pause, seek, stop, retry and renewal keep it.
   */
  playbackId: string;
  provider: VibePlayerSource["type"];
  /** Sorted, merged and non-overlapping; never empty. */
  ranges: readonly VibePlayerWatchedRange[];
  reason: VibePlayerWatchedRangesReason;
  /**
   * 1-based and increasing per report within a playback, so a host can drop
   * a duplicate `playbackId` + `sequence` and order what it received.
   */
  sequence: number;
  sourceId: string;
}

/** Timer jitter allowed beyond wall-clock progress before a jump is a seek. */
const jitterSeconds = 1;
/** A seek the provider abandons without `seeked` must not block counting. */
const seekEndingEvents: ReadonlySet<VibePlayerEventName> = new Set([
  "ended",
  "pause",
  "seeked",
]);
/** What a release delivers the pending batch as. */
const releaseReasons: Readonly<
  Record<VibePlayerRawReleaseReason, VibePlayerWatchedRangesReason>
> = { close: "close", reload: "reload", stop: "pause" };

interface Sample {
  at: number;
  time: number;
}

/**
 * Turns the controller's raw adapter feed into watched ranges. Only progress
 * while `readyState` is `playing` counts, and only when media time advanced
 * no faster than the wall clock allows. Seek boundaries (an announced
 * controller seek or the media's `seeking`) deliver the batch and keep jumps
 * out of playback; a seek ends on `seeked`, `pause`, `ended`, a fatal
 * `error`, an acknowledged pause or a release.
 */
export class VibePlayerWatchedRangesTracker {
  private last: Sample | null = null;
  private seeking = false;
  private readonly batch: VibePlayerWatchedBatch;
  private readonly coverage = new VibePlayerWatchedCoverage();
  private readonly now: () => number;

  constructor(
    emit: (report: VibePlayerWatchedRangesReport) => void,
    now: () => number = Date.now
  ) {
    this.batch = new VibePlayerWatchedBatch(emit);
    this.now = now;
  }

  /** Unique seconds the current playback watched, delivered or not. */
  get watchedSeconds(): number {
    return this.coverage.seconds;
  }

  observe(entry: VibePlayerRawFeedEntry): void {
    if (entry.kind === "release") {
      this.release(entry.reason);
    } else if (entry.kind === "command") {
      this.observePause(entry.source, entry.snapshot);
    } else if (entry.kind === "seek") {
      this.boundary(entry.source, entry.snapshot, "seek");
    } else if (entry.kind === "playback") {
      // Ranges never span playbacks: the old one closes with its batch.
      this.last = null;
      this.flush("close");
      this.batch.begin(entry.playback.id);
      this.coverage.reset();
    } else if (entry.kind === "event") {
      this.observeEvent(entry.source, entry.event);
    }
  }

  flush(reason: VibePlayerWatchedRangesReason): void {
    this.batch.deliver(reason);
  }

  private observeEvent(
    source: VibePlayerSource,
    event: VibePlayerAdapterEvent
  ): void {
    const { snapshot, type } = event;
    if (source.id !== this.batch.source?.id) {
      this.release("close");
    }
    this.batch.observe(source, snapshot.duration);
    if (this.observeSeek(event)) {
      return;
    }
    if (this.last) {
      this.advance(snapshot.currentTime, snapshot.playbackRate);
    }
    const startsAfterSeek =
      type === "seeked" && snapshot.readyState === "buffering";
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

  /**
   * A viewer pause the adapter acknowledged: count up to where it stopped and
   * deliver the batch before the command resolves. A provider still playing
   * ends the range with its own `pause` event instead.
   */
  private observePause(
    source: VibePlayerSource,
    snapshot: VibePlayerSnapshot
  ): void {
    if (source.id === this.batch.source?.id && snapshot.paused) {
      this.seeking = false;
      this.boundary(source, snapshot, "pause");
    }
  }

  /** Counts up to the adapter's own position, then delivers the batch. */
  private boundary(
    source: VibePlayerSource,
    snapshot: VibePlayerSnapshot,
    reason: VibePlayerWatchedRangesReason
  ): void {
    if (source.id !== this.batch.source?.id) {
      return;
    }
    if (this.last) {
      this.advance(snapshot.currentTime, snapshot.playbackRate);
    }
    this.last = null;
    this.flush(reason);
  }

  /** The adapter or source went away: no seek or sample survives it. */
  private release(reason: VibePlayerRawReleaseReason): void {
    this.last = null;
    this.seeking = false;
    this.flush(releaseReasons[reason]);
    if (reason === "close") {
      this.batch.close();
    }
  }

  private observeSeek({ payload, type }: VibePlayerAdapterEvent): boolean {
    if (type === "seeking") {
      this.flush("seek");
      this.seeking = true;
    } else if (
      seekEndingEvents.has(type) ||
      // Nonfatal provider diagnostics (for example HLS retries) keep seeking.
      (type === "error" && payload?.fatal !== false)
    ) {
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
      this.batch.add(last.time, time);
      this.coverage.add(last.time, time);
    }
  }
}
