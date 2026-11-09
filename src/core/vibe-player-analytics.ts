import { getVibePlayerProgressMilestone } from "./vibe-player-events";
import type {
  VibePlayerAnalyticsEvent,
  VibePlayerAnalyticsEventName,
  VibePlayerControllerState,
  VibePlayerSnapshot,
  VibePlayerSource,
} from "./vibe-player-types";

export interface VibePlayerAnalyticsSessionHost {
  emit(event: VibePlayerAnalyticsEvent): void;
  /** Unique seconds the current playback watched. */
  watchedSeconds(): number;
}

export class VibePlayerAnalyticsSession {
  private readonly emit: (event: VibePlayerAnalyticsEvent) => void;
  private readonly sentEvents = new Set<VibePlayerAnalyticsEventName>();
  private readonly watchedSeconds: () => number;

  constructor(host: VibePlayerAnalyticsSessionHost) {
    this.emit = (event) => host.emit(event);
    this.watchedSeconds = () => host.watchedSeconds();
  }

  clear(): void {
    this.sentEvents.clear();
  }

  close(state: VibePlayerControllerState): void {
    const event = createClosedAnalyticsEvent(state);
    if (event) {
      this.emitOnce(event);
    }
  }

  emitOnce(event: VibePlayerAnalyticsEvent): void {
    if (this.sentEvents.has(event.type)) {
      return;
    }
    this.sentEvents.add(event.type);
    this.emit(event);
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
    const percent = (this.watchedSeconds() / duration) * 100;
    let milestone = getVibePlayerProgressMilestone(percent, this.sentEvents);
    while (milestone && isCurrent()) {
      this.emitOnce({
        currentTime,
        duration,
        provider: source.type,
        sourceId: source.id,
        type: milestone.event,
      });
      milestone = getVibePlayerProgressMilestone(percent, this.sentEvents);
    }
  }
}

export function createClosedAnalyticsEvent(
  state: VibePlayerControllerState
): VibePlayerAnalyticsEvent | null {
  const source = state.currentSource;
  if (!source) {
    return null;
  }
  return {
    currentTime: state.snapshot.currentTime,
    duration: state.snapshot.duration,
    provider: source.type,
    sourceId: source.id,
    type: "closed",
  };
}
