import { isVibePlayerPlaybackBlockedError } from "./vibe-player-errors";
import type {
  VibePlayerAdapter,
  VibePlayerAnalyticsEvent,
  VibePlayerControllerState,
  VibePlayerResumeStore,
  VibePlayerSnapshot,
  VibePlayerSource,
} from "./vibe-player-types";

export interface HandleVibePlayerControllerPlayInput {
  adapter: VibePlayerAdapter | null;
  updateState: (next: Partial<VibePlayerControllerState>) => void;
}

export interface HandleVibePlayerControllerPauseInput {
  adapter: VibePlayerAdapter | null;
  updateState: (next: Partial<VibePlayerControllerState>) => void;
}

export async function handleVibePlayerControllerPlay({
  adapter,
  updateState,
}: HandleVibePlayerControllerPlayInput): Promise<void> {
  if (!adapter?.capabilities.supportsPlayback) {
    return;
  }
  updateState({
    lastEvent: "play",
    playbackBlocked: false,
    snapshot: createPlayIntentSnapshot(adapter.getSnapshot()),
  });
  try {
    await adapter.play();
  } catch (error) {
    if (isVibePlayerPlaybackBlockedError(error)) {
      updateState({
        lastEvent: "playblocked",
        playbackBlocked: true,
        snapshot: adapter.getSnapshot(),
      });
      return;
    }
    throw error;
  }
}

export async function handleVibePlayerControllerPause({
  adapter,
  updateState,
}: HandleVibePlayerControllerPauseInput): Promise<void> {
  if (!adapter?.capabilities.supportsPlayback) {
    return;
  }
  await adapter.pause();
  updateState({
    lastEvent: "pause",
    snapshot: createPauseIntentSnapshot(adapter.getSnapshot()),
  });
}

function createPlayIntentSnapshot(
  snapshot: VibePlayerSnapshot
): VibePlayerSnapshot {
  if (!snapshot.paused && snapshot.readyState === "playing") {
    return snapshot;
  }
  return { ...snapshot, paused: false, readyState: "buffering" };
}

function createPauseIntentSnapshot(
  snapshot: VibePlayerSnapshot
): VibePlayerSnapshot {
  if (
    snapshot.readyState === "buffering" ||
    snapshot.readyState === "playing"
  ) {
    return { ...snapshot, paused: true, readyState: "ready" };
  }
  return { ...snapshot, paused: true };
}

export interface HandleVibePlayerControllerSeekInput {
  adapter: VibePlayerAdapter | null;
  currentSource: VibePlayerSource | null;
  duration: number;
  emitAnalytics: (event: VibePlayerAnalyticsEvent) => void;
  resumeStore: VibePlayerResumeStore | undefined;
  seconds: number;
}

export async function handleVibePlayerControllerSeek({
  adapter,
  currentSource,
  duration,
  emitAnalytics,
  resumeStore,
  seconds,
}: HandleVibePlayerControllerSeekInput): Promise<void> {
  if (!(adapter && currentSource)) {
    return;
  }
  await adapter.seekTo(seconds);
  resumeStore?.set(currentSource.id, seconds);
  emitAnalytics({
    currentTime: seconds,
    duration,
    provider: currentSource.type,
    sourceId: currentSource.id,
    type: "seek",
  });
}
