import { getVibePlayerProgressMilestone } from "./vibe-player-events";
import type { VibePlayerRawFeedEntry } from "./vibe-player-raw-feed";
import type {
  VibePlayerAnalyticsEvent,
  VibePlayerAnalyticsEventName,
  VibePlayerControllerState,
  VibePlayerSnapshot,
  VibePlayerSource,
} from "./vibe-player-types";

export interface VibePlayerAnalyticsSessionHost {
  emit(event: VibePlayerAnalyticsEvent): void;
  state(): VibePlayerControllerState;
  /** Unique seconds the current playback watched. */
  watchedSeconds(): number;
}

/**
 * One session per opened source: `opened` and `closed` bracket it, and
 * retry, renewal, stop and remounting the same source keep it. A host load,
 * a source with another id, `closeSource()` and teardown end it. `started`,
 * the progress milestones and `completed` fire once per playback, so playing
 * again after `ended` reports them again.
 */
export class VibePlayerAnalyticsSession {
  private source: VibePlayerSource | null = null;
  /** Once-per-playback events already reported. */
  private readonly sent = new Set<VibePlayerAnalyticsEventName>();
  private readonly host: VibePlayerAnalyticsSessionHost;

  constructor(host: VibePlayerAnalyticsSessionHost) {
    this.host = host;
  }

  /** Each playback reports its own events; a host load ends the session. */
  observe(entry: VibePlayerRawFeedEntry): void {
    if (entry.kind !== "playback") {
      return;
    }
    if (entry.playback.cause === "load") {
      this.close();
    }
    this.sent.clear();
  }

  /** Attaching a source with another id ends the open session first. */
  attach(source: VibePlayerSource): void {
    if (this.source && this.source.id !== source.id) {
      this.close();
    }
  }

  /** Reports `opened` unless this source's session is already open. */
  open(source: VibePlayerSource): void {
    this.attach(source);
    if (this.source) {
      return;
    }
    this.source = source;
    this.host.emit({
      provider: source.type,
      sourceId: source.id,
      type: "opened",
    });
  }

  close(): void {
    const { source } = this;
    if (!source) {
      return;
    }
    this.source = null;
    this.sent.clear();
    const { snapshot } = this.host.state();
    this.host.emit({
      currentTime: snapshot.currentTime,
      duration: snapshot.duration,
      provider: source.type,
      sourceId: source.id,
      type: "closed",
    });
  }

  /** Reports `event` unless this playback already reported its type. */
  emitOnce(event: VibePlayerAnalyticsEvent): void {
    if (this.sent.has(event.type)) {
      return;
    }
    this.sent.add(event.type);
    this.host.emit(event);
  }

  /**
   * Reports each milestone the playback's watched coverage (unique watched
   * seconds over the duration) reached; an unknown duration reports none.
   */
  recordProgress(
    source: VibePlayerSource,
    { currentTime, duration }: VibePlayerSnapshot,
    isCurrent: () => boolean
  ): void {
    if (!(Number.isFinite(duration) && duration > 0)) {
      return;
    }
    const percent = (this.host.watchedSeconds() / duration) * 100;
    let milestone = getVibePlayerProgressMilestone(percent, this.sent);
    while (milestone && isCurrent()) {
      this.emitOnce({
        currentTime,
        duration,
        provider: source.type,
        sourceId: source.id,
        type: milestone.event,
      });
      milestone = getVibePlayerProgressMilestone(percent, this.sent);
    }
  }
}
