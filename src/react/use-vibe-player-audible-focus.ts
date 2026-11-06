import { useEffect } from "react";
import type { VibePlayerController } from "../core/vibe-player-controller";
import type { VibePlayerControllerState } from "../core/vibe-player-types";
import { useVibePlayerAudioFocus } from "./use-vibe-player-audio-focus";

interface UseVibePlayerAudibleFocusOptions {
  controller: VibePlayerController;
  group: string | false;
  state: VibePlayerControllerState;
}

export function useVibePlayerAudibleFocus({
  controller,
  group,
  state,
}: UseVibePlayerAudibleFocusOptions): void {
  const { claim, release } = useVibePlayerAudioFocus({
    group,
    onPause: () => controller.pause(),
  });
  const { muted, paused, readyState, volume } = state.snapshot;
  useEffect(() => {
    const playable =
      readyState === "playing" ||
      readyState === "buffering" ||
      readyState === "ready";
    if (!(paused || muted) && volume > 0 && playable) {
      claim();
    } else {
      release();
    }
  }, [claim, muted, paused, readyState, release, volume]);
}
