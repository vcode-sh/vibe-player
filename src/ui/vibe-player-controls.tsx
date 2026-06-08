import {
  formatVibePlayerPlaybackRate,
  formatVibePlayerTime,
  getNextVibePlayerPlaybackRate,
  type VibePlayerCapabilities,
  type VibePlayerSnapshot,
} from "../core";
import { VibePlayerTimeline } from "./vibe-player-timeline";

export interface VibePlayerControlsProps {
  capabilities: VibePlayerCapabilities;
  captionsEnabled?: boolean;
  chromeHidden?: boolean;
  onClose?: (() => void) | undefined;
  onSeek: (seconds: number) => void;
  onSetPlaybackRate: (rate: number) => void;
  onToggleCaptions?: () => void;
  onToggleFullscreen?: () => void;
  onToggleMute: () => void;
  onTogglePlay: () => void;
  snapshot: VibePlayerSnapshot;
  title?: string | undefined;
}

function chromeClassName(hidden: boolean, direction: "top" | "bottom"): string {
  if (!hidden) {
    return "vibe-player-controls__chrome--shown";
  }
  return direction === "top"
    ? "vibe-player-controls__chrome--hide-top"
    : "vibe-player-controls__chrome--hide-bottom";
}

export function VibePlayerControls({
  capabilities,
  captionsEnabled = false,
  chromeHidden = false,
  onClose,
  onSeek,
  onSetPlaybackRate,
  onToggleCaptions,
  onToggleFullscreen,
  onToggleMute,
  onTogglePlay,
  snapshot,
  title,
}: VibePlayerControlsProps) {
  const remaining = Math.max(0, snapshot.duration - snapshot.currentTime);
  const canShowCaptions =
    capabilities.canShowCaptions && Boolean(onToggleCaptions);
  const canFullscreen =
    capabilities.canFullscreen && Boolean(onToggleFullscreen);

  return (
    <>
      <div
        aria-hidden={chromeHidden}
        className={`vibe-player-controls__top ${chromeClassName(chromeHidden, "top")}`}
        inert={chromeHidden ? true : undefined}
      >
        {title ? (
          <span className="vibe-player-controls__title">{title}</span>
        ) : null}
        {onClose ? (
          <button
            aria-label="Close"
            className="vibe-player-controls__button"
            onClick={onClose}
            type="button"
          >
            x
          </button>
        ) : null}
      </div>
      <div
        aria-hidden
        className={`vibe-player-controls__scrim ${
          chromeHidden ? "vibe-player-controls__scrim--hidden" : ""
        }`}
      />
      <div
        aria-hidden={chromeHidden}
        className={`vibe-player-controls__bottom ${chromeClassName(chromeHidden, "bottom")}`}
        inert={chromeHidden ? true : undefined}
      >
        <button
          aria-label={snapshot.paused ? "Play" : "Pause"}
          className="vibe-player-controls__button"
          onClick={onTogglePlay}
          type="button"
        >
          {snapshot.paused ? ">" : "||"}
        </button>
        {capabilities.supportsMute ? (
          <button
            aria-label={snapshot.muted ? "Unmute" : "Mute"}
            className="vibe-player-controls__button"
            onClick={onToggleMute}
            type="button"
          >
            {snapshot.muted ? "M" : "V"}
          </button>
        ) : null}
        <span className="vibe-player-controls__time">
          {formatVibePlayerTime(snapshot.currentTime)}
        </span>
        <VibePlayerTimeline
          currentTime={snapshot.currentTime}
          disabled={!(capabilities.canSeek && capabilities.supportsDuration)}
          duration={snapshot.duration}
          onSeek={onSeek}
        />
        <span className="vibe-player-controls__time">
          -{formatVibePlayerTime(remaining)}
        </span>
        {capabilities.canSetPlaybackRate ? (
          <button
            aria-label={`Playback speed ${formatVibePlayerPlaybackRate(
              snapshot.playbackRate
            )}`}
            className="vibe-player-controls__rate"
            onClick={() =>
              onSetPlaybackRate(
                getNextVibePlayerPlaybackRate(snapshot.playbackRate)
              )
            }
            title="Playback speed"
            type="button"
          >
            {formatVibePlayerPlaybackRate(snapshot.playbackRate)}
          </button>
        ) : null}
        {canShowCaptions ? (
          <button
            aria-label={captionsEnabled ? "Hide captions" : "Show captions"}
            className="vibe-player-controls__button"
            data-active={captionsEnabled}
            onClick={onToggleCaptions}
            type="button"
          >
            CC
          </button>
        ) : null}
        {canFullscreen ? (
          <button
            aria-label="Full screen"
            className="vibe-player-controls__button"
            onClick={onToggleFullscreen}
            type="button"
          >
            []
          </button>
        ) : null}
      </div>
    </>
  );
}
