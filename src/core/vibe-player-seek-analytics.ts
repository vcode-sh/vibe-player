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
  /** Where playback progressed elsewhere since, before it reached this. */
  stray: number | null;
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
 * never unsettles a newer one. One the media never reaches is dropped when
 * the adapter rejects it, when a `seeked` finishes elsewhere (a newer
 * announcement's or one nobody announced), or when playback progresses
 * forward elsewhere twice, so a single late report of the old position is
 * still tolerated.
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
        { reached: false, stray: null, target: entry.target },
      ];
      this.position = entry.target;
      this.ended = false;
    } else if (entry.kind === "seekfailed") {
      this.forget(entry.target);
    } else if (entry.kind === "release") {
      this.announced = [];
      this.ended = false;
    } else if (entry.kind === "event") {
      this.observeEvent(entry.source, entry.event);
    }
  }

  private observeEvent(
    source: VibePlayerSource,
    event: VibePlayerAdapterEvent
  ): void {
    const { snapshot, type } = event;
    const from = this.position;
    this.position = snapshot.currentTime;
    if (type === "seeking") {
      this.observeSeeking(source, snapshot, from);
    } else if (type === "seeked") {
      this.settleSeeked(snapshot.currentTime);
    } else {
      this.ended ||= type === "ended";
      this.settle(snapshot.currentTime, isPlaybackProgress(event));
    }
  }

  /** The newest unreached announcement of `target` was rejected. */
  private forget(target: number): void {
    const index = findLastAnnouncement(
      this.announced,
      (announcement) => !announcement.reached && announcement.target === target
    );
    if (index !== -1) {
      this.announced = this.announced.filter((_, item) => item !== index);
    }
  }

  /**
   * A seek finished at `time`: it settles the newest announcement there and
   * supersedes every older one; with none there, the media is elsewhere.
   */
  private settleSeeked(time: number): void {
    const settled = findLastAnnouncement(this.announced, ({ target }) =>
      isNear(target, time)
    );
    this.announced = this.announced.filter(
      ({ reached, target }, index) =>
        settled !== -1 && index > settled && !(reached || isNear(target, time))
    );
  }

  /**
   * Marks announcements at `time` as reached and drops reached ones the
   * media has since moved away from. Forward `progress` elsewhere twice
   * drops an unreached one: the media plays somewhere else.
   */
  private settle(time: number, progress: boolean): void {
    const pending: Announcement[] = [];
    for (const announcement of this.announced) {
      const { reached, stray, target } = announcement;
      if (isNear(target, time)) {
        pending.push({ ...announcement, reached: true });
      } else if (reached) {
        // Reached and moved on: settled.
      } else if (!progress) {
        pending.push(announcement);
      } else if (stray === null || time <= stray) {
        pending.push({ ...announcement, stray: time });
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

/** `Array.prototype.findLastIndex` is ES2023; the package targets ES2022. */
function findLastAnnouncement(
  announced: readonly Announcement[],
  matches: (announcement: Announcement) => boolean
): number {
  for (let index = announced.length - 1; index >= 0; index -= 1) {
    const announcement = announced[index];
    if (announcement && matches(announcement)) {
      return index;
    }
  }
  return -1;
}

function isNear(target: number, time: number): boolean {
  return Math.abs(target - time) <= echoToleranceSeconds;
}

/** The media is playing and reports where. */
function isPlaybackProgress({ snapshot, type }: VibePlayerAdapterEvent) {
  return (
    (type === "timeupdate" || type === "playing") &&
    !snapshot.paused &&
    snapshot.readyState === "playing"
  );
}
