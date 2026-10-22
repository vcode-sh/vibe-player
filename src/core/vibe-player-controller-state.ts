import { createIdleSnapshot } from "./vibe-player-time";
import type { VibePlayerControllerState } from "./vibe-player-types";

export function createInitialControllerState(): VibePlayerControllerState {
  return {
    capabilities: null,
    currentSource: null,
    error: null,
    isMounted: false,
    lastEvent: null,
    playbackBlocked: false,
    snapshot: createIdleSnapshot(),
  };
}
