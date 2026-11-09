import {
  isVibePlayerMediaInterruption,
  isVibePlayerPlaybackBlockedError,
} from "./vibe-player-errors";
import type { VibePlayerResumeWriter } from "./vibe-player-resume-writer";
import { clampVibePlayerTime } from "./vibe-player-time";
import type {
  VibePlayerAdapter,
  VibePlayerAnalyticsEvent,
  VibePlayerControllerState,
  VibePlayerSnapshot,
  VibePlayerSource,
} from "./vibe-player-types";

export interface HandleVibePlayerControllerPlayInput {
  adapter: VibePlayerAdapter | null;
  updateState: (next: Partial<VibePlayerControllerState>) => void;
}

export interface HandleVibePlayerControllerPauseInput {
  /** Receives the adapter's own snapshot once it acknowledged the pause. */
  acknowledge: (snapshot: VibePlayerSnapshot) => void;
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
  const failed = adapter.getSnapshot().readyState === "error";
  updateState({
    error: null,
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
    // Playing media that had already failed is still a command failure.
    if (
      failed ||
      !isVibePlayerMediaInterruption(error, adapter.getSnapshot())
    ) {
      throw error;
    }
  }
}

export async function handleVibePlayerControllerPause({
  acknowledge,
  adapter,
  updateState,
}: HandleVibePlayerControllerPauseInput): Promise<void> {
  if (!adapter?.capabilities.supportsPlayback) {
    return;
  }
  await adapter.pause();
  const snapshot = adapter.getSnapshot();
  acknowledge(snapshot);
  updateState({
    lastEvent: "pause",
    snapshot: createPauseIntentSnapshot(snapshot),
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
  /** Runs right before the adapter seeks, with its own prior snapshot. */
  announce: (snapshot: VibePlayerSnapshot, target: number) => void;
  currentSource: VibePlayerSource | null;
  emitAnalytics: (event: VibePlayerAnalyticsEvent) => void;
  /** Runs when the adapter rejected the announced seek. */
  failed: (target: number) => void;
  isCurrent: () => boolean;
  /** Saves the settled position. */
  resume: VibePlayerResumeWriter | null;
  seconds: number;
  syncFromAdapter: () => void;
}

export async function handleVibePlayerControllerSeek({
  adapter,
  announce,
  currentSource,
  emitAnalytics,
  failed,
  isCurrent,
  resume,
  seconds,
  syncFromAdapter,
}: HandleVibePlayerControllerSeekInput): Promise<void> {
  if (!(adapter && currentSource && adapter.capabilities.canSeek)) {
    return;
  }
  const snapshot = adapter.getSnapshot();
  const { currentTime: from, duration } = snapshot;
  const acceptedTime = clampVibePlayerTime(seconds, duration, false);
  announce(snapshot, acceptedTime);
  // Seek observers (watched ranges) may already have replaced the source.
  if (!isCurrent()) {
    return;
  }
  try {
    await adapter.seekTo(acceptedTime);
  } catch (error) {
    if (isCurrent()) {
      failed(acceptedTime);
    }
    throw error;
  }
  if (!isCurrent()) {
    return;
  }
  syncFromAdapter();
  if (!isCurrent()) {
    return;
  }
  resume?.seeked(currentSource, acceptedTime, duration);
  if (!isCurrent()) {
    return;
  }
  emitAnalytics(createSeekEvent(currentSource, from, acceptedTime, duration));
}

function createSeekEvent(
  source: VibePlayerSource,
  from: number,
  currentTime: number,
  duration: number
): VibePlayerAnalyticsEvent {
  return {
    currentTime,
    duration,
    from,
    initiator: "controller",
    provider: source.type,
    sourceId: source.id,
    type: "seek",
  };
}
