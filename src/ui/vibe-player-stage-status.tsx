import type { JSX } from "react";
import type { VibePlayerSnapshot } from "../core";
import { useVibePlayerDelayedFlag } from "../react/use-vibe-player-delayed-flag";
import { RetryIcon } from "./vibe-player-icons";
import { useVibePlayerUI, vibePlayerClassName } from "./vibe-player-ui-context";
import type { VibePlayerLabels } from "./vibe-player-ui-types";

export interface VibePlayerStageStatusProps {
  /**
   * Announce status changes as a polite live region (default true). The
   * ready-made players pass false because their own announcer speaks them.
   */
  live?: boolean | undefined;
  onRetry?: (() => void) | undefined;
  playbackBlocked: boolean;
  snapshot: VibePlayerSnapshot;
}

export interface VibePlayerStageStatusView {
  label: string;
  tone: "busy" | "error" | "notice";
}

const busyStatusDelayMs = 320;

/** The status a viewer sees now; busy appears only after the spinner delay. */
export function useVibePlayerStageStatusView(
  input: VibePlayerStageStatusViewInput
): VibePlayerStageStatusView | null {
  const { labels } = useVibePlayerUI();
  const view = getVibePlayerStageStatusView(input, labels);
  const revealBusy = useVibePlayerDelayedFlag(
    view?.tone === "busy",
    busyStatusDelayMs
  );
  if (view?.tone === "busy" && !revealBusy) {
    return null;
  }
  return view;
}

export function VibePlayerStageStatus({
  live = true,
  onRetry,
  playbackBlocked,
  snapshot,
}: VibePlayerStageStatusProps): JSX.Element | null {
  const view = useVibePlayerStageStatusView({ playbackBlocked, snapshot });
  return (
    <VibePlayerStageStatusPanel live={live} onRetry={onRetry} view={view} />
  );
}

interface VibePlayerStageStatusPanelProps
  extends Pick<VibePlayerStageStatusProps, "live" | "onRetry"> {
  view: VibePlayerStageStatusView | null;
}

/** Draws a status view computed once by its owner (the full stage). */
export function VibePlayerStageStatusPanel({
  live = true,
  onRetry,
  view,
}: VibePlayerStageStatusPanelProps) {
  const { classNames, labels } = useVibePlayerUI();
  if (!view) {
    return null;
  }
  const liveProps = live
    ? ({ "aria-live": "polite", role: "status" } as const)
    : {};
  const className = vibePlayerClassName(
    `vibe-player-stage__status vibe-player-stage__status--${view.tone}`,
    classNames.status
  );
  if (view.tone === "busy") {
    return (
      <div className={className} {...liveProps}>
        <span
          aria-hidden="true"
          className="vibe-player-stage__status-spinner"
        />
        <span className="vibe-player-visually-hidden">{view.label}</span>
      </div>
    );
  }

  return (
    <div className={className} {...liveProps}>
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

export interface VibePlayerStageStatusViewInput {
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
