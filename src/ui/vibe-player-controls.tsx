import type { ReactNode } from "react";
import type { VibePlayerCapabilities, VibePlayerSnapshot } from "../core";
import { VibePlayerBottomControls } from "./vibe-player-bottom-controls";
import { getVibePlayerChromeClassName } from "./vibe-player-control-chrome";
import { CloseIcon } from "./vibe-player-icons";
import type { VibePlayerSeekThumbnail } from "./vibe-player-seek-thumbnail-types";
import { VibePlayerTooltip } from "./vibe-player-tooltip";

export interface VibePlayerControlsProps {
  capabilities: VibePlayerCapabilities;
  captionsEnabled?: boolean;
  chromeHidden?: boolean;
  onClose?: (() => void) | undefined;
  onSeek: (seconds: number) => void;
  onSetMuted?: ((muted: boolean) => void) | undefined;
  onSetPlaybackRate: (rate: number) => void;
  onSetQuality?: ((qualityId: string) => void) | undefined;
  onSetVolume?: ((volume: number) => void) | undefined;
  onToggleCaptions?: () => void;
  onToggleFullscreen?: () => void;
  onToggleMute: () => void;
  onTogglePictureInPicture?: () => void;
  onTogglePlay: () => void;
  seekThumbnails?: readonly VibePlayerSeekThumbnail[] | undefined;
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
            <VibePlayerTooltip align="end" label="Close">
              <button
                aria-label="Close"
                className="vibe-player-controls__button"
                onClick={onClose}
                type="button"
              >
                <CloseIcon />
              </button>
            </VibePlayerTooltip>
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
  onSetMuted,
  onSetPlaybackRate,
  onSetQuality,
  onSetVolume,
  onToggleCaptions,
  onToggleFullscreen,
  onToggleMute,
  onTogglePictureInPicture,
  onTogglePlay,
  seekThumbnails,
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
            onSetMuted={onSetMuted}
            onSetPlaybackRate={onSetPlaybackRate}
            onSetQuality={onSetQuality}
            onSetVolume={onSetVolume}
            onToggleCaptions={onToggleCaptions}
            onToggleFullscreen={onToggleFullscreen}
            onToggleMute={onToggleMute}
            onTogglePictureInPicture={onTogglePictureInPicture}
            onTogglePlay={onTogglePlay}
            seekThumbnails={seekThumbnails}
            snapshot={snapshot}
          />
        </>
      ) : null}
    </>
  );
}
