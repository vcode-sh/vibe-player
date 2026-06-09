import type { VibePlayerSnapshot } from "../core";

export interface VibePlayerStageStatusProps {
  playbackBlocked: boolean;
  snapshot: VibePlayerSnapshot;
}

interface VibePlayerStageStatusView {
  label: string;
  tone: "busy" | "error" | "notice";
}

export function VibePlayerStageStatus({
  playbackBlocked,
  snapshot,
}: VibePlayerStageStatusProps) {
  const view = getVibePlayerStageStatusView({ playbackBlocked, snapshot });

  if (!view) {
    return null;
  }

  const className = `vibe-player-stage__status vibe-player-stage__status--${view.tone}`;
  if (view.tone === "busy") {
    return (
      <div aria-live="polite" className={className} role="status">
        <span
          aria-hidden="true"
          className="vibe-player-stage__status-spinner"
        />
        <span className="vibe-player-stage__status-sr">{view.label}</span>
      </div>
    );
  }

  return (
    <div aria-live="polite" className={className} role="status">
      {view.label}
    </div>
  );
}

interface VibePlayerStageStatusViewInput {
  playbackBlocked: boolean;
  snapshot: VibePlayerSnapshot;
}

function getVibePlayerStageStatusView({
  playbackBlocked,
  snapshot,
}: VibePlayerStageStatusViewInput): VibePlayerStageStatusView | null {
  if (playbackBlocked) {
    return { label: "Play to start", tone: "notice" };
  }

  if (snapshot.readyState === "error") {
    return { label: "Playback unavailable", tone: "error" };
  }

  if (!shouldShowBusyStatus(snapshot)) {
    return null;
  }

  return { label: "Loading video", tone: "busy" };
}

function shouldShowBusyStatus(snapshot: VibePlayerSnapshot): boolean {
  if (
    !(snapshot.readyState === "buffering" || snapshot.readyState === "loading")
  ) {
    return false;
  }
  if (!snapshot.paused) {
    return true;
  }
  return (
    snapshot.readyState === "loading" &&
    snapshot.currentTime <= 0 &&
    snapshot.duration <= 0
  );
}
