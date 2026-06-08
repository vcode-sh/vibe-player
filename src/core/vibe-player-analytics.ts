import { getVibePlayerProgressMilestone } from "./vibe-player-events";
import type {
  VibePlayerAdapterEvent,
  VibePlayerAnalyticsEvent,
  VibePlayerAnalyticsEventName,
  VibePlayerControllerState,
  VibePlayerSource,
} from "./vibe-player-types";

interface ProgressAnalyticsInput {
  sentEvents: ReadonlySet<VibePlayerAnalyticsEventName>;
  snapshot: VibePlayerAdapterEvent["snapshot"];
  source: VibePlayerSource;
}

type VibePlayerAnalyticsEmitter = (event: VibePlayerAnalyticsEvent) => void;

export class VibePlayerAnalyticsSession {
  private readonly emit: VibePlayerAnalyticsEmitter;
  private readonly sentEvents = new Set<VibePlayerAnalyticsEventName>();

  constructor(emit: VibePlayerAnalyticsEmitter) {
    this.emit = emit;
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

  recordProgress(
    source: VibePlayerSource,
    snapshot: VibePlayerAdapterEvent["snapshot"]
  ): void {
    const event = createProgressAnalyticsEvent({
      sentEvents: this.sentEvents,
      snapshot,
      source,
    });
    if (event) {
      this.emitOnce(event);
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

export function createProgressAnalyticsEvent({
  sentEvents,
  snapshot,
  source,
}: ProgressAnalyticsInput): VibePlayerAnalyticsEvent | null {
  if (!(Number.isFinite(snapshot.duration) && snapshot.duration > 0)) {
    return null;
  }

  const percent = Math.floor((snapshot.currentTime / snapshot.duration) * 100);
  const milestone = getVibePlayerProgressMilestone(percent, sentEvents);
  if (!milestone) {
    return null;
  }

  return {
    currentTime: snapshot.currentTime,
    duration: snapshot.duration,
    provider: source.type,
    sourceId: source.id,
    type: milestone.event,
  };
}
