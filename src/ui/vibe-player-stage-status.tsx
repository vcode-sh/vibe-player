import type { VibePlayerSnapshot } from "../core";
import { useVibePlayerDelayedFlag } from "../react/use-vibe-player-delayed-flag";
import { RetryIcon } from "./vibe-player-icons";
import { useVibePlayerUI, vibePlayerClassName } from "./vibe-player-ui-context";
import type { VibePlayerLabels } from "./vibe-player-ui-types";

export interface VibePlayerStageStatusProps {
  onRetry?: (() => void) | undefined;
  playbackBlocked: boolean;
  snapshot: VibePlayerSnapshot;
}

interface VibePlayerStageStatusView {
  label: string;
  tone: "busy" | "error" | "notice";
}

const busyStatusDelayMs = 320;

export function VibePlayerStageStatus({
  onRetry,
  playbackBlocked,
  snapshot,
}: VibePlayerStageStatusProps) {
  const { classNames, labels } = useVibePlayerUI();
  const view = getVibePlayerStageStatusView(
    { playbackBlocked, snapshot },
    labels
  );
  const revealBusy = useVibePlayerDelayedFlag(
    view?.tone === "busy",
    busyStatusDelayMs
  );

  if (!view) {
    return null;
  }

  const className = vibePlayerClassName(
    `vibe-player-stage__status vibe-player-stage__status--${view.tone}`,
    classNames.status
  );
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
      {view.tone === "error" && onRetry ? (
        <button className={classNames.button} onClick={onRetry} type="button">
          <RetryIcon />
          {labels.retry}
        </button>
      ) : null}
    </div>
  );
}

interface VibePlayerStageStatusViewInput {
  playbackBlocked: boolean;
  snapshot: VibePlayerSnapshot;
}

function getVibePlayerStageStatusView(
  { playbackBlocked, snapshot }: VibePlayerStageStatusViewInput,
  labels: VibePlayerLabels
): VibePlayerStageStatusView | null {
  if (playbackBlocked) {
    return { label: labels.playToStart, tone: "notice" };
  }

  if (snapshot.readyState === "error") {
    return { label: labels.unavailable, tone: "error" };
  }

  if (!shouldShowBusyStatus(snapshot)) {
    return null;
  }

  return {
    label:
      snapshot.readyState === "loading" ? labels.loading : labels.buffering,
    tone: "busy",
  };
}

function shouldShowBusyStatus(snapshot: VibePlayerSnapshot): boolean {
  if (
    !(snapshot.readyState === "buffering" || snapshot.readyState === "loading")
  ) {
    return false;
  }
  return !snapshot.paused;
}
