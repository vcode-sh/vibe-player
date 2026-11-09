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
  /** Captured with the position: a released adapter's flag is gone. */
  live: boolean;
  seconds: number;
  source: VibePlayerSource;
}

/**
 * What the store holds; `reason` is null for a position the controller
 * seeks to.
 */
interface ResumeMark {
  reason: ResumeReason | null;
  seconds: number;
  sourceId: string;
}

/**
 * Saves resume positions from the provider's own events. Progress saves at
 * most once per 2 seconds of movement; a settled seek, pause, stop, page
 * hide and close (including a host load) always save, once per boundary.
 * Restored positions are never saved, nothing saves after `ended` (which
 * clears the position), and live sources never touch the store.
 */
export class VibePlayerResumeWriter {
  /** After a pause, progress waits for the provider's next play. */
  private held = false;
  private latest: ResumePosition | null = null;
  /** A source the attached adapter reported live; it stays live once closed. */
  private liveSourceId: string | null = null;
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
      if (this.isLive()) {
        this.liveSourceId = entry.source.id;
      }
      this.observeEvent(entry.source, entry.event);
    } else if (entry.kind === "command") {
      this.pause(entry.source, entry.snapshot);
    } else if (entry.kind === "seek") {
      const { source, target } = entry;
      this.mark = { reason: null, seconds: target, sourceId: source.id };
    } else if (entry.kind === "release") {
      this.release(entry.reason);
    } else if (entry.playback.cause === "load") {
      // The host loaded a source, even the same one: what played closes.
      this.release("close");
    }
  }

  /** A controller seek settled at `seconds`. */
  seeked(source: VibePlayerSource, seconds: number, duration: number): void {
    const live = this.isLive();
    this.write(
      { duration: knownDuration(duration), live, seconds, source },
      "seek"
    );
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
    const position = this.toPosition(source, snapshot);
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
    const position = this.toPosition(source, snapshot);
    this.latest = position;
    if (!this.isMarked(position, null)) {
      this.write(position, "seek");
    }
  }

  private pause(source: VibePlayerSource, snapshot: VibePlayerSnapshot): void {
    this.held = true;
    this.seeking = false;
    if (snapshot.paused && isSavable(snapshot)) {
      this.writeOnce(this.toPosition(source, snapshot), "pause");
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
      this.liveSourceId = null;
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

  /** Positions come from the attached adapter, so its flag is current. */
  private toPosition(
    source: VibePlayerSource,
    { currentTime, duration }: VibePlayerSnapshot
  ): ResumePosition {
    return {
      duration: knownDuration(duration),
      live: this.isLive(),
      seconds: currentTime,
      source,
    };
  }

  /**
   * Live sources never save, including a position captured before the
   * adapter detected the live stream and saved after it, or after release.
   */
  private write(position: ResumePosition, reason: ResumeReason): void {
    if (
      position.live ||
      this.isLive() ||
      position.source.id === this.liveSourceId
    ) {
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

function knownDuration(duration: number): number {
  return Number.isFinite(duration) && duration > 0 ? duration : 0;
}
