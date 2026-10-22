import type {
  VibePlayerControllerState,
  VibePlayerSnapshot,
} from "vibe-player";

export interface LiveYouTubeProbe {
  autoplayUserActivation: boolean | null;
  commandError: string | null;
  events: string[];
  load: "pending" | "ready" | "error";
  loadError: string | null;
  remounts: number;
  samples: VibePlayerSnapshot[];
  state: VibePlayerControllerState;
}

declare global {
  interface Window {
    youtubeAcceptance: LiveYouTubeProbe;
  }
}
