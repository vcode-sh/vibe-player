import type { VibePlayerSnapshot } from "../core/vibe-player-runtime-types";
import type { VibePlayerSurfacePhase } from "./vibe-player-surface-types";

const steadyPhases = new Set<VibePlayerSurfacePhase>(["playing", "renewing"]);
const startPhases = new Set<VibePlayerSurfacePhase>(["idle", "loading"]);

/** True while media plays, including a renewal that started mid-playback. */
export function isVibePlayerSurfacePlaying(phase: VibePlayerSurfacePhase) {
  return steadyPhases.has(phase);
}

/**
 * Folds `readyState` into a chrome phase. `previous` keeps a mid-playback
 * stall or renewal from reading as a fresh load, and keeps a ready but never
 * played source idle.
 */
export function getVibePlayerSurfacePhase(
  { currentTime, paused, readyState }: VibePlayerSnapshot,
  renewing: boolean,
  previous: VibePlayerSurfacePhase
): VibePlayerSurfacePhase {
  if (readyState === "error" || readyState === "ended") {
    return readyState;
  }
  if (readyState === "idle") {
    return "idle";
  }
  const steady = steadyPhases.has(previous);
  if (renewing && steady) {
    return "renewing";
  }
  if (!paused) {
    const waiting = readyState === "loading" || readyState === "buffering";
    return waiting && !steady ? "loading" : "playing";
  }
  return startPhases.has(previous) && currentTime === 0 ? "idle" : "paused";
}

/** Busy feedback waits, so short loads and stalls never flash a spinner. */
export function getVibePlayerSurfaceBusyDelay(
  phase: VibePlayerSurfacePhase,
  readyState: VibePlayerSnapshot["readyState"]
): number | null {
  if (phase === "renewing") {
    return 600;
  }
  const stalled =
    phase === "playing" &&
    (readyState === "buffering" || readyState === "loading");
  return phase === "loading" || stalled ? 320 : null;
}

/** Scrub and keyboard seeks stay inside the media. */
export function clampVibePlayerTime(seconds: number, duration: number) {
  return Math.min(Math.max(0, duration), Math.max(0, seconds));
}

/** Phases with a loaded position that a scrub may move. */
export function canScrubVibePlayerSurface(phase: VibePlayerSurfacePhase) {
  return phase !== "idle" && phase !== "error" && phase !== "loading";
}
