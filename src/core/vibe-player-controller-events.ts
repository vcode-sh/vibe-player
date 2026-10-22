import type { VibePlayerAnalyticsSession } from "./vibe-player-analytics";
import { createVibePlayerError } from "./vibe-player-errors";
import { createIdleCapabilities } from "./vibe-player-time";
import type {
  VibePlayerAdapter,
  VibePlayerAdapterEvent,
  VibePlayerAnalyticsEvent,
  VibePlayerControllerState,
  VibePlayerEventName,
  VibePlayerResumeStore,
  VibePlayerSnapshot,
  VibePlayerSource,
} from "./vibe-player-types";

export interface HandleVibePlayerAdapterEventInput {
  adapter: VibePlayerAdapter | null;
  analyticsSession: VibePlayerAnalyticsSession;
  currentSnapshot: VibePlayerSnapshot;
  currentSource: VibePlayerSource | null;
  emitAnalytics: (event: VibePlayerAnalyticsEvent) => void;
  event: VibePlayerAdapterEvent;
  lastEvent: VibePlayerEventName | null;
  playbackBlocked: boolean;
  resumeStore?: VibePlayerResumeStore | undefined;
  updateState: (next: Partial<VibePlayerControllerState>) => void;
}

export function handleVibePlayerAdapterEvent({
  adapter,
  analyticsSession,
  currentSource,
  currentSnapshot,
  emitAnalytics,
  event,
  lastEvent,
  playbackBlocked,
  resumeStore,
  updateState,
}: HandleVibePlayerAdapterEventInput): void {
  const stateEvent = getControllerStateEvent({
    currentSnapshot,
    event,
    lastEvent,
  });
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
  if (stateEvent !== event) {
    return;
  }
  if (!currentSource) {
    return;
  }
  if (event.type === "timeupdate") {
    resumeStore?.set(currentSource.id, event.snapshot.currentTime);
    analyticsSession.recordProgress(currentSource, event.snapshot);
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

interface GetControllerStateEventInput {
  currentSnapshot: VibePlayerSnapshot;
  event: VibePlayerAdapterEvent;
  lastEvent: VibePlayerEventName | null;
}

function getControllerStateEvent({
  currentSnapshot,
  event,
  lastEvent,
}: GetControllerStateEventInput): VibePlayerAdapterEvent {
  if (!shouldPreservePausedIntent({ currentSnapshot, event, lastEvent })) {
    return event;
  }
  return {
    ...event,
    snapshot: {
      ...event.snapshot,
      paused: true,
      readyState: "ready",
    },
    type: "pause",
  };
}

function shouldPreservePausedIntent({
  currentSnapshot,
  event,
  lastEvent,
}: GetControllerStateEventInput): boolean {
  if (!(lastEvent === "pause" && currentSnapshot.paused)) {
    return false;
  }
  if (event.snapshot.paused) {
    return false;
  }
  return !(event.type === "ended" || event.type === "error");
}
