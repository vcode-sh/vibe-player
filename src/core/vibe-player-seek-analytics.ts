import type { VibePlayerAnalyticsEvent } from "./vibe-player-controller-types";
import type { VibePlayerRawFeedEntry } from "./vibe-player-raw-feed";
import type {
  VibePlayerAdapterEvent,
  VibePlayerSnapshot,
} from "./vibe-player-runtime-types";
import type { VibePlayerSource } from "./vibe-player-source-types";

/** A `seeking` this close to an announced target is that seek's echo. */
const echoToleranceSeconds = 0.5;
/** Unsettled announcements kept; older ones are forgotten. */
const announcedLimit = 8;

/** A controller seek the media has not settled yet. */
interface Announcement {
  /** The media reported this position, so moving away settles it. */
  reached: boolean;
  target: number;
}

/**
 * Reports a `seek` for every seek the media starts itself (native controls,
 * Picture-in-Picture, the browser). The controller announces its own seeks
 * on the raw feed before it makes them: `seekTo()` reports for itself, and a
 * restored resume, recovery or replay position is not a seek at all. When
 * the media echoes an announced seek as `seeking`/`seeked`, nothing is
 * reported twice. An announcement settles on its own `seeked`, or once the
 * media reached its target and moved on, so a late event of an earlier seek
 * never unsettles a newer one.
 */
export class VibePlayerSeekAnalytics {
  private announced: Announcement[] = [];
  private ended = false;
  private position = 0;
  private readonly emit: (event: VibePlayerAnalyticsEvent) => void;

  constructor(emit: (event: VibePlayerAnalyticsEvent) => void) {
    this.emit = emit;
  }

  observe(entry: VibePlayerRawFeedEntry): void {
    if (entry.kind === "seek") {
      this.announced = [
        ...this.announced.slice(1 - announcedLimit),
        { reached: false, target: entry.target },
      ];
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
    } else {
      this.ended ||= type === "ended";
      this.settle(snapshot.currentTime, type === "seeked");
    }
  }

  /**
   * Marks announcements at `time` as reached (or settled, on `seeked`) and
   * drops reached ones the media has since moved away from.
   */
  private settle(time: number, seeked: boolean): void {
    const pending: Announcement[] = [];
    for (const { reached, target } of this.announced) {
      const near = isNear(target, time);
      if (near && !seeked) {
        pending.push({ reached: true, target });
      } else if (!(near || reached)) {
        pending.push({ reached, target });
      }
    }
    this.announced = pending;
  }

  private observeSeeking(
    source: VibePlayerSource,
    snapshot: VibePlayerSnapshot,
    from: number
  ): void {
    const echo = this.announced.some(({ target }) =>
      isNear(target, snapshot.currentTime)
    );
    // Ended media is paused; unpaused, it rewinds because it plays again.
    const replay = this.ended && !snapshot.paused;
    this.ended = false;
    this.settle(snapshot.currentTime, false);
    if (echo || replay) {
      return;
    }
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
