import type { VibePlayerControllerState } from "vibe-player";

export interface LiveYouTubeStageProbe {
  events: string[];
  state: VibePlayerControllerState | null;
}

declare global {
  interface Window {
    youtubeStageAcceptance: LiveYouTubeStageProbe;
  }
}
