import type { VibePlayerSnapshot } from "../core";

export interface VibePlayerStageStatusProps {
  playbackBlocked: boolean;
  readyState: VibePlayerSnapshot["readyState"];
}

export function VibePlayerStageStatus({
  playbackBlocked,
  readyState,
}: VibePlayerStageStatusProps) {
  if (playbackBlocked) {
    return (
      <div
        aria-live="polite"
        className="vibe-player-stage__status"
        role="status"
      >
        Play to start
      </div>
    );
  }

  if (readyState === "error") {
    return (
      <div
        aria-live="polite"
        className="vibe-player-stage__status"
        role="status"
      >
        Playback unavailable
      </div>
    );
  }

  if (!(readyState === "buffering" || readyState === "loading")) {
    return null;
  }

  return (
    <div aria-live="polite" className="vibe-player-stage__status" role="status">
      Loading
    </div>
  );
}
