import type {
  VibePlayerAdapter,
  VibePlayerAnalyticsEvent,
  VibePlayerControllerState,
  VibePlayerSource,
} from "./vibe-player-types";

export interface HandleVibePlayerLoadErrorInput {
  adapter: VibePlayerAdapter;
  emitAnalytics: (event: VibePlayerAnalyticsEvent) => void;
  source: VibePlayerSource;
  updateState: (
    next: Partial<VibePlayerControllerState>
  ) => VibePlayerControllerState;
}

export function handleVibePlayerLoadError({
  adapter,
  emitAnalytics,
  source,
  updateState,
}: HandleVibePlayerLoadErrorInput): void {
  const snapshot = adapter.getSnapshot();
  updateState({
    capabilities: adapter.capabilities,
    currentSource: source,
    lastEvent: "error",
    playbackBlocked: false,
    snapshot: { ...snapshot, readyState: "error" },
  });
  emitAnalytics({
    currentTime: snapshot.currentTime,
    duration: snapshot.duration,
    provider: source.type,
    sourceId: source.id,
    type: "error",
  });
}
