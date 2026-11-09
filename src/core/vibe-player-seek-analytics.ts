import type { VibePlayerAnalyticsEvent } from "./vibe-player-controller-types";
import type { VibePlayerRawFeedEntry } from "./vibe-player-raw-feed";
import type {
  VibePlayerAdapterEvent,
  VibePlayerSnapshot,
} from "./vibe-player-runtime-types";
import type { VibePlayerSource } from "./vibe-player-source-types";

/** A `seeking` this close to an announced target is that seek's echo. */
const echoToleranceSeconds = 0.5;

/**
 * Reports a `seek` for every seek the media starts itself (native controls,
 * Picture-in-Picture, the browser). The controller announces its own seeks
 * on the raw feed before it makes them: `seekTo()` reports for itself, and a
 * restored resume, recovery or replay position is not a seek at all. When
 * the media echoes an announced seek as `seeking`/`seeked`, nothing is
 * reported twice.
 */
export class VibePlayerSeekAnalytics {
  private announced: number[] = [];
  private ended = false;
  private position = 0;
  private readonly emit: (event: VibePlayerAnalyticsEvent) => void;

  constructor(emit: (event: VibePlayerAnalyticsEvent) => void) {
    this.emit = emit;
  }

  observe(entry: VibePlayerRawFeedEntry): void {
    if (entry.kind === "seek") {
      this.announced.push(entry.target);
      this.position = entry.target;
      this.ended = false;
    } else if (entry.kind === "release") {
      this.announced = [];
      this.ended = false;
    } else if (entry.kind === "event") {
      this.observeEvent(entry.source, entry.event);
    }
  }

  private observeEvent(
    source: VibePlayerSource,
    { snapshot, type }: VibePlayerAdapterEvent
  ): void {
    const from = this.position;
    this.position = snapshot.currentTime;
    if (type === "seeking") {
      this.observeSeeking(source, snapshot, from);
    } else if (type === "ended") {
      this.ended = true;
    } else if (type === "seeked") {
      this.announced = [];
    } else {
      // Media that moved on settled every announced seek without an echo.
      this.announced = this.announced.filter((target) =>
        isNear(target, snapshot.currentTime)
      );
    }
  }

  private observeSeeking(
    source: VibePlayerSource,
    snapshot: VibePlayerSnapshot,
    from: number
  ): void {
    const echo = this.announced.some((target) =>
      isNear(target, snapshot.currentTime)
    );
    // Ended media is paused; unpaused, it rewinds because it plays again.
    const replay = this.ended && !snapshot.paused;
    this.ended = false;
    if (echo || replay) {
      return;
    }
    this.announced = [];
    this.emit({
      currentTime: snapshot.currentTime,
      duration: snapshot.duration,
      from,
      initiator: "media",
      provider: source.type,
      sourceId: source.id,
      type: "seek",
    });
  }
}

function isNear(target: number, time: number): boolean {
  return Math.abs(target - time) <= echoToleranceSeconds;
}
