import { createVibePlayerError } from "./vibe-player-errors";
import { createIdleSnapshot } from "./vibe-player-time";
import type {
  VibePlayerAdapter,
  VibePlayerAnalyticsEvent,
  VibePlayerControllerState,
  VibePlayerError,
  VibePlayerSource,
} from "./vibe-player-types";

export interface HandleVibePlayerLoadErrorInput {
  adapter: VibePlayerAdapter | null;
  cause: unknown;
  emitAnalytics: (event: VibePlayerAnalyticsEvent) => void;
  phase: VibePlayerError["phase"];
  source: VibePlayerSource;
  updateState: (
    next: Partial<VibePlayerControllerState>
  ) => VibePlayerControllerState;
}

export function handleVibePlayerLoadError({
  adapter,
  cause,
  emitAnalytics,
  phase,
  source,
  updateState,
}: HandleVibePlayerLoadErrorInput): void {
  const snapshot = adapter?.getSnapshot() ?? createIdleSnapshot();
  updateState({
    capabilities: adapter?.capabilities ?? null,
    currentSource: source,
    error: createVibePlayerError({ cause, phase, source }),
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
