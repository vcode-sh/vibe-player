import type {
  VibePlayerResumeContext,
  VibePlayerResumeStore,
} from "./vibe-player-controller-types";
import type {
  VibePlayerRawFeedEntry,
  VibePlayerRawReleaseReason,
} from "./vibe-player-raw-feed";
import type {
  VibePlayerAdapterEvent,
  VibePlayerSnapshot,
} from "./vibe-player-runtime-types";
import { isPlayableSnapshot } from "./vibe-player-source-recovery";
import type { VibePlayerSource } from "./vibe-player-source-types";

type ResumeReason = VibePlayerResumeContext["reason"];

/** Playback moves this far from the last saved position before it saves. */
const progressStepSeconds = 2;
/** Positions this close are the same spot. */
const sameSpotSeconds = 0.5;

interface ResumePosition {
  duration: number;
  seconds: number;
  source: VibePlayerSource;
}

/** What the store holds; `reason` is null for a position the controller seeks to. */
interface ResumeMark {
  reason: ResumeReason | null;
  seconds: number;
  sourceId: string;
}

/**
 * Saves resume positions from the provider's own events. Progress saves at
 * most once per 2 seconds of movement; a settled seek, pause, stop, page
 * hide and close always save, once per boundary. Restored positions are
 * never saved, nothing saves after `ended` (which clears the position), and
 * live sources never touch the store.
 */
export class VibePlayerResumeWriter {
  /** After a pause, progress waits for the provider's next play. */
  private held = false;
  private latest: ResumePosition | null = null;
  private mark: ResumeMark | null = null;
  private seeking = false;
  private readonly isLive: () => boolean;
  private readonly store: VibePlayerResumeStore;

  constructor(store: VibePlayerResumeStore, isLive: () => boolean) {
    this.store = store;
    this.isLive = isLive;
  }

  observe(entry: VibePlayerRawFeedEntry): void {
    if (entry.kind === "event") {
      this.observeEvent(entry.source, entry.event);
    } else if (entry.kind === "command") {
      this.pause(entry.source, entry.snapshot);
    } else if (entry.kind === "seek") {
      const { source, target } = entry;
      this.mark = { reason: null, seconds: target, sourceId: source.id };
    } else if (entry.kind === "release") {
      this.release(entry.reason);
    }
  }

  /** A controller seek settled at `seconds`. */
  seeked(source: VibePlayerSource, seconds: number, duration: number): void {
    this.write({ duration: knownDuration(duration), seconds, source }, "seek");
  }

  /** The page was hidden and may never come back. */
  hidden(): void {
    this.writeOnce(this.latest, "hidden");
  }

  private observeEvent(
    source: VibePlayerSource,
    { payload, snapshot, type }: VibePlayerAdapterEvent
  ): void {
    if (type === "ended") {
      this.ended(source);
      return;
    }
    if (type === "seeking") {
      this.seeking = true;
    } else if (type === "play" || type === "playing") {
      this.held = false;
    } else if (type === "error" && payload?.fatal !== false) {
      this.seeking = false;
    } else if (type === "seeked") {
      this.seeking = false;
      this.settleMediaSeek(source, snapshot);
    } else if (type === "pause") {
      this.pause(source, snapshot);
    } else if (type === "timeupdate") {
      this.progress(source, snapshot);
    }
  }

  private progress(source: VibePlayerSource, snapshot: VibePlayerSnapshot) {
    if (this.held || this.seeking || !isSavable(snapshot) || snapshot.paused) {
      return;
    }
    const position = toPosition(source, snapshot);
    this.latest = position;
    const saved = this.mark?.sourceId === source.id ? this.mark.seconds : 0;
    if (Math.abs(position.seconds - saved) >= progressStepSeconds) {
      this.write(position, "progress");
    }
  }

  /** The controller already saved its own seek or restored this spot. */
  private settleMediaSeek(
    source: VibePlayerSource,
    snapshot: VibePlayerSnapshot
  ): void {
    if (!isSavable(snapshot)) {
      return;
    }
    const position = toPosition(source, snapshot);
    this.latest = position;
    if (!this.isMarked(position, null)) {
      this.write(position, "seek");
    }
  }

  private pause(source: VibePlayerSource, snapshot: VibePlayerSnapshot): void {
    this.held = true;
    this.seeking = false;
    if (snapshot.paused && isSavable(snapshot)) {
      this.writeOnce(toPosition(source, snapshot), "pause");
    }
  }

  private ended(source: VibePlayerSource): void {
    this.latest = null;
    this.mark = null;
    this.seeking = false;
    if (!this.isLive()) {
      this.store.clear(source.id);
    }
  }

  private release(reason: VibePlayerRawReleaseReason): void {
    this.seeking = false;
    if (reason !== "reload") {
      this.writeOnce(this.latest, reason === "stop" ? "pause" : "close");
    }
    if (reason === "close") {
      this.latest = null;
    }
  }

  /** Saves unless the same boundary already saved this spot. */
  private writeOnce(
    position: ResumePosition | null,
    reason: ResumeReason
  ): void {
    if (position && !this.isMarked(position, reason)) {
      this.write(position, reason);
    }
  }

  /** A null `reason` accepts a mark of every reason at this spot. */
  private isMarked(
    { seconds, source }: ResumePosition,
    reason: ResumeReason | null
  ): boolean {
    const { mark } = this;
    return (
      mark?.sourceId === source.id &&
      Math.abs(mark.seconds - seconds) < sameSpotSeconds &&
      (reason === null || mark.reason === reason)
    );
  }

  private write(position: ResumePosition, reason: ResumeReason): void {
    if (this.isLive()) {
      return;
    }
    const { duration, seconds, source } = position;
    this.latest = position;
    this.mark = { reason, seconds, sourceId: source.id };
    this.store.set(source.id, seconds, { duration, reason });
  }
}

function isSavable(snapshot: VibePlayerSnapshot): boolean {
  return isPlayableSnapshot(snapshot) && snapshot.readyState !== "ended";
}

function toPosition(
  source: VibePlayerSource,
  { currentTime, duration }: VibePlayerSnapshot
): ResumePosition {
  return { duration: knownDuration(duration), seconds: currentTime, source };
}

function knownDuration(duration: number): number {
  return Number.isFinite(duration) && duration > 0 ? duration : 0;
}
