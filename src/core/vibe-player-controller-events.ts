import type { VibePlayerAnalyticsSession } from "./vibe-player-analytics";
import { createVibePlayerError } from "./vibe-player-errors";
import { createIdleCapabilities } from "./vibe-player-time";
import type {
  VibePlayerAdapter,
  VibePlayerAdapterEvent,
  VibePlayerAnalyticsEvent,
  VibePlayerControllerState,
  VibePlayerResumeStore,
  VibePlayerSource,
} from "./vibe-player-types";

export interface HandleVibePlayerAdapterEventInput {
  adapter: VibePlayerAdapter | null;
  analyticsSession: VibePlayerAnalyticsSession;
  currentSource: VibePlayerSource | null;
  emitAnalytics: (event: VibePlayerAnalyticsEvent) => void;
  event: VibePlayerAdapterEvent;
  isCurrent: () => boolean;
  playbackBlocked: boolean;
  preservePausedIntent: boolean;
  resumeStore?: VibePlayerResumeStore | undefined;
  updateState: (next: Partial<VibePlayerControllerState>) => void;
}

export function handleVibePlayerAdapterEvent({
  adapter,
  analyticsSession,
  currentSource,
  emitAnalytics,
  event,
  isCurrent,
  playbackBlocked,
  preservePausedIntent,
  resumeStore,
  updateState,
}: HandleVibePlayerAdapterEventInput): void {
  const stateEvent = getControllerStateEvent(event, preservePausedIntent);
  updateState({
    capabilities: adapter?.capabilities ?? createIdleCapabilities(),
    ...(stateEvent.type === "error" && currentSource
      ? {
          error: createVibePlayerError({
            details: event.payload,
            phase: "playback",
            source: currentSource,
          }),
        }
      : {}),
    lastEvent: stateEvent.type,
    playbackBlocked: getNextPlaybackBlocked(stateEvent, playbackBlocked),
    snapshot: stateEvent.snapshot,
  });
  if (stateEvent !== event || !currentSource || !isCurrent()) {
    return;
  }
  if (event.type === "timeupdate") {
    resumeStore?.set(currentSource.id, event.snapshot.currentTime);
    if (isCurrent()) {
      analyticsSession.recordProgress(currentSource, event.snapshot);
    }
    return;
  }
  if (event.type === "play") {
    analyticsSession.emitOnce({
      currentTime: event.snapshot.currentTime,
      duration: event.snapshot.duration,
      provider: currentSource.type,
      sourceId: currentSource.id,
      type: "started",
    });
    return;
  }
  if (event.type === "ended") {
    resumeStore?.clear(currentSource.id);
    if (!isCurrent()) {
      return;
    }
    analyticsSession.emitOnce({
      currentTime: event.snapshot.currentTime,
      duration: event.snapshot.duration,
      provider: currentSource.type,
      sourceId: currentSource.id,
      type: "completed",
    });
    return;
  }
  if (event.type === "error") {
    emitAnalytics({
      currentTime: event.snapshot.currentTime,
      duration: event.snapshot.duration,
      provider: currentSource.type,
      sourceId: currentSource.id,
      type: "error",
    });
  }
}

function getNextPlaybackBlocked(
  event: VibePlayerAdapterEvent,
  playbackBlocked: boolean
): boolean {
  if (event.type === "play") {
    return false;
  }
  if (event.type === "playblocked") {
    return true;
  }
  return playbackBlocked;
}

function getControllerStateEvent(
  event: VibePlayerAdapterEvent,
  preservePausedIntent: boolean
): VibePlayerAdapterEvent {
  if (!preservePausedIntent) {
    return event;
  }
  return {
    ...event,
    snapshot: { ...event.snapshot, paused: true, readyState: "ready" },
    type: "pause",
  };
}
