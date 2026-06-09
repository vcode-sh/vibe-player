import type { VibePlayerControllerState } from "@vibe-code/vibe-player";

export function getDemoPlayerStatusText(
  state: VibePlayerControllerState
): string | null {
  if (state.playbackBlocked) {
    return "Play to start";
  }
  if (state.snapshot.readyState === "error") {
    return "Playback unavailable";
  }
  if (
    state.snapshot.readyState === "buffering" ||
    state.snapshot.readyState === "loading"
  ) {
    return "Loading";
  }
  return null;
}

export function isInteractiveClickTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) {
    return false;
  }
  return Boolean(
    target.closest(
      "a, button, input, select, textarea, .vibe-player-controls__top, .vibe-player-controls__bottom"
    )
  );
}
