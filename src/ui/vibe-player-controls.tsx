import type { ReactNode } from "react";
import type { VibePlayerCapabilities, VibePlayerSnapshot } from "../core";
import { VibePlayerBottomControls } from "./vibe-player-bottom-controls";
import { getVibePlayerChromeClassName } from "./vibe-player-control-chrome";
import { CloseIcon } from "./vibe-player-icons";
import type { VibePlayerSeekThumbnail } from "./vibe-player-seek-thumbnail-types";
import { VibePlayerTooltip } from "./vibe-player-tooltip";
import { useVibePlayerUI, vibePlayerClassName } from "./vibe-player-ui-context";

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
  /**
   * Seeks relative to the position; given, skip back/forward buttons flank
   * Play wherever the media can seek.
   */
  onSkip?: ((seconds: number) => void) | undefined;
  onToggleCaptions?: () => void;
  onToggleFullscreen?: () => void;
  onToggleMute: () => void;
  onTogglePictureInPicture?: () => void;
  onTogglePlay: () => void;
  /** Seconds a skip button moves. Default 10. */
  seekStep?: number | undefined;
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
  const { classNames, labels } = useVibePlayerUI();
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
            <VibePlayerTooltip align="end" label={labels.close}>
              <button
                aria-label={labels.close}
                className={vibePlayerClassName(
                  "vibe-player-controls__button",
                  classNames.button
                )}
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
  onSkip,
  onToggleCaptions,
  onToggleFullscreen,
  onToggleMute,
  onTogglePictureInPicture,
  onTogglePlay,
  seekStep,
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
            onSkip={onSkip}
            onToggleCaptions={onToggleCaptions}
            onToggleFullscreen={onToggleFullscreen}
            onToggleMute={onToggleMute}
            onTogglePictureInPicture={onTogglePictureInPicture}
            onTogglePlay={onTogglePlay}
            seekStep={seekStep}
            seekThumbnails={seekThumbnails}
            snapshot={snapshot}
          />
        </>
      ) : null}
    </>
  );
}
