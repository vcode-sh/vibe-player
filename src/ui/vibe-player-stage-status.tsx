import { useEffect, useState } from "react";
import type { VibePlayerSnapshot } from "../core";

export interface VibePlayerStageStatusProps {
  playbackBlocked: boolean;
  snapshot: VibePlayerSnapshot;
}

interface VibePlayerStageStatusView {
  label: string;
  tone: "busy" | "error" | "notice";
}

const busyStatusDelayMs = 320;

export function VibePlayerStageStatus({
  playbackBlocked,
  snapshot,
}: VibePlayerStageStatusProps) {
  const view = getVibePlayerStageStatusView({ playbackBlocked, snapshot });
  const revealBusy = useDelayedBusyStatus(view?.tone === "busy");

  if (!view) {
    return null;
  }

  const className = `vibe-player-stage__status vibe-player-stage__status--${view.tone}`;
  if (view.tone === "busy") {
    if (!revealBusy) {
      return null;
    }
    return (
      <div
        aria-label={view.label}
        aria-live="polite"
        className={className}
        role="status"
      >
        <span aria-hidden="true" className="vibe-player-stage__status-halo" />
        <span
          aria-hidden="true"
          className="vibe-player-stage__status-spinner"
        />
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

  return { label: "Buffering video", tone: "busy" };
}

function shouldShowBusyStatus(snapshot: VibePlayerSnapshot): boolean {
  if (
    !(snapshot.readyState === "buffering" || snapshot.readyState === "loading")
  ) {
    return false;
  }
  return !snapshot.paused;
}

function useDelayedBusyStatus(active: boolean): boolean {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!active) {
      setVisible(false);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setVisible(true);
    }, busyStatusDelayMs);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [active]);

  return active && visible;
}
