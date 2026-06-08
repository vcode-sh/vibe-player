import type { VibePlayerAnalyticsSession } from "./vibe-player-analytics";
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
  playbackBlocked: boolean;
  resumeStore?: VibePlayerResumeStore | undefined;
  updateState: (next: Partial<VibePlayerControllerState>) => void;
}

export function handleVibePlayerAdapterEvent({
  adapter,
  analyticsSession,
  currentSource,
  emitAnalytics,
  event,
  playbackBlocked,
  resumeStore,
  updateState,
}: HandleVibePlayerAdapterEventInput): void {
  updateState({
    capabilities: adapter?.capabilities ?? createIdleCapabilities(),
    lastEvent: event.type,
    playbackBlocked: event.type === "play" ? false : playbackBlocked,
    snapshot: event.snapshot,
  });
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
