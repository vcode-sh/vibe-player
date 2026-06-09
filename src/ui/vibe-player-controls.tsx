import type { ReactNode } from "react";
import type { VibePlayerCapabilities, VibePlayerSnapshot } from "../core";
import { VibePlayerBottomControls } from "./vibe-player-bottom-controls";
import { getVibePlayerChromeClassName } from "./vibe-player-control-chrome";
import { CloseIcon } from "./vibe-player-icons";

export interface VibePlayerControlsProps {
  capabilities: VibePlayerCapabilities;
  captionsEnabled?: boolean;
  chromeHidden?: boolean;
  onClose?: (() => void) | undefined;
  onSeek: (seconds: number) => void;
  onSetPlaybackRate: (rate: number) => void;
  onSetQuality?: ((qualityId: string) => void) | undefined;
  onToggleCaptions?: () => void;
  onToggleFullscreen?: () => void;
  onToggleMute: () => void;
  onTogglePictureInPicture?: () => void;
  onTogglePlay: () => void;
  snapshot: VibePlayerSnapshot;
  title?: string | undefined;
  topActions?: ReactNode;
}

interface VibePlayerTopControlsProps
  extends Pick<
    VibePlayerControlsProps,
    "chromeHidden" | "onClose" | "title" | "topActions"
  > {}

function VibePlayerTopControls({
  chromeHidden = false,
  onClose,
  title,
  topActions,
}: VibePlayerTopControlsProps) {
  return (
    <div
      aria-hidden={chromeHidden}
      className={`vibe-player-controls__top ${getVibePlayerChromeClassName(chromeHidden, "top")}`}
      inert={chromeHidden ? true : undefined}
    >
      {title ? (
        <span className="vibe-player-controls__title">{title}</span>
      ) : null}
      {topActions || onClose ? (
        <div className="vibe-player-controls__actions">
          {topActions}
          {onClose ? (
            <button
              aria-label="Close"
              className="vibe-player-controls__button"
              onClick={onClose}
              title="Close"
              type="button"
            >
              <CloseIcon />
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function VibePlayerControls({
  capabilities,
  captionsEnabled = false,
  chromeHidden = false,
  onClose,
  onSeek,
  onSetPlaybackRate,
  onSetQuality,
  onToggleCaptions,
  onToggleFullscreen,
  onToggleMute,
  onTogglePictureInPicture,
  onTogglePlay,
  snapshot,
  title,
  topActions,
}: VibePlayerControlsProps) {
  const shouldShowPlaybackControls = capabilities.supportsPlayback;
  return (
    <>
      <VibePlayerTopControls
        chromeHidden={chromeHidden}
        onClose={onClose}
        title={title}
        topActions={topActions}
      />
      {shouldShowPlaybackControls ? (
        <>
          <div
            aria-hidden
            className={`vibe-player-controls__scrim ${
              chromeHidden ? "vibe-player-controls__scrim--hidden" : ""
            }`}
          />
          <VibePlayerBottomControls
            capabilities={capabilities}
            captionsEnabled={captionsEnabled}
            chromeHidden={chromeHidden}
            onSeek={onSeek}
            onSetPlaybackRate={onSetPlaybackRate}
            onSetQuality={onSetQuality}
            onToggleCaptions={onToggleCaptions}
            onToggleFullscreen={onToggleFullscreen}
            onToggleMute={onToggleMute}
            onTogglePictureInPicture={onTogglePictureInPicture}
            onTogglePlay={onTogglePlay}
            snapshot={snapshot}
          />
        </>
      ) : null}
    </>
  );
}
