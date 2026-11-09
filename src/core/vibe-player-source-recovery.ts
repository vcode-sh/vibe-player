import type {
  VibePlayerAdapterEvent,
  VibePlayerSnapshot,
} from "./vibe-player-runtime-types";
import type { VibePlayerSource } from "./vibe-player-source-types";

export function getResumePosition(
  snapshot: VibePlayerSnapshot
): VibePlayerSnapshot {
  return snapshot.readyState === "ended"
    ? { ...snapshot, currentTime: 0 }
    : snapshot;
}

export function isPlayableSnapshot(snapshot: VibePlayerSnapshot): boolean {
  return (
    snapshot.readyState !== "error" &&
    snapshot.readyState !== "loading" &&
    snapshot.readyState !== "idle"
  );
}

/** Native media failures can reset currentTime before the error event arrives. */
export function getRecoveryPosition(
  snapshot: VibePlayerSnapshot,
  previous: VibePlayerSnapshot | null,
  lastGood: VibePlayerSnapshot | null
): VibePlayerSnapshot {
  if (snapshot.currentTime > 0 || isPlayableSnapshot(snapshot)) {
    return getResumePosition(snapshot);
  }
  if (previous && (previous.currentTime > 0 || isPlayableSnapshot(previous))) {
    return getResumePosition(previous);
  }
  return getResumePosition(lastGood ?? snapshot);
}

export function expiresSoon(source: VibePlayerSource): boolean {
  const expiry =
    typeof source.expiresAt === "string"
      ? Date.parse(source.expiresAt)
      : source.expiresAt;
  return expiry !== undefined && expiry - Date.now() < 30_000;
}

export function canRenew(event: VibePlayerAdapterEvent): boolean {
  if (event.type !== "error" || event.payload?.fatal === false) {
    return false;
  }
  const { payload } = event;
  // Media elements conceal HTTP status: an expired or forbidden file URL is a
  // source error before media data loaded.
  return (
    (payload?.kind === "source" && payload.mediaReadyState === 0) ||
    payload?.status === 401 ||
    payload?.status === 403 ||
    payload?.network === true ||
    payload?.nativeHls === true ||
    payload?.type === "networkError"
  );
}
