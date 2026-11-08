import type { VibePlayerCapabilities, VibePlayerSnapshot } from "../core";
import {
  VibePlayerCaptionsControl,
  VibePlayerFullscreenControl,
  VibePlayerPictureInPictureControl,
  VibePlayerPlaybackControl,
  VibePlayerRateControl,
  VibePlayerSkipControl,
} from "./vibe-player-bottom-control-buttons";
import { getVibePlayerChromeClassName } from "./vibe-player-control-chrome";
import { VibePlayerQualityControl } from "./vibe-player-quality-control";
import type { VibePlayerSeekThumbnail } from "./vibe-player-seek-thumbnail-types";
import { VibePlayerTimeline } from "./vibe-player-timeline";
import { useVibePlayerUI, vibePlayerClassName } from "./vibe-player-ui-context";
import { VibePlayerVolumeControl } from "./vibe-player-volume-control";

export interface VibePlayerBottomControlsProps {
  capabilities: VibePlayerCapabilities;
  captionsEnabled: boolean;
  chromeHidden: boolean;
  onSeek: (seconds: number) => void;
  onSetMuted: ((muted: boolean) => void) | undefined;
  onSetPlaybackRate: (rate: number) => void;
  onSetQuality: ((qualityId: string) => void) | undefined;
  onSetVolume: ((volume: number) => void) | undefined;
  onSkip?: ((seconds: number) => void) | undefined;
  onToggleCaptions: (() => void) | undefined;
  onToggleFullscreen: (() => void) | undefined;
  onToggleMute: () => void;
  onTogglePictureInPicture: (() => void) | undefined;
  onTogglePlay: () => void;
  seekStep?: number | undefined;
  seekThumbnails?: readonly VibePlayerSeekThumbnail[] | undefined;
  snapshot: VibePlayerSnapshot;
}

export function VibePlayerBottomControls({
  capabilities,
  captionsEnabled,
  chromeHidden,
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
  seekStep = 10,
  seekThumbnails,
  snapshot,
}: VibePlayerBottomControlsProps) {
  const { classNames, formatTime } = useVibePlayerUI();
  const remaining = Math.max(0, snapshot.duration - snapshot.currentTime);
  return (
    <div
      aria-hidden={chromeHidden}
      className={vibePlayerClassName(
        `vibe-player-controls__bottom ${getVibePlayerChromeClassName(chromeHidden, "bottom")}`,
        classNames.controls
      )}
      inert={chromeHidden ? true : undefined}
    >
      <div className="vibe-player-controls__playback">
        <VibePlayerSkipControl
          capabilities={capabilities}
          onSkip={onSkip}
          side={-1}
          step={seekStep}
        />
        <VibePlayerPlaybackControl
          onTogglePlay={onTogglePlay}
          snapshot={snapshot}
        />
        <VibePlayerSkipControl
          capabilities={capabilities}
          onSkip={onSkip}
          side={1}
          step={seekStep}
        />
        <VibePlayerVolumeControl
          capabilities={capabilities}
          onSetMuted={onSetMuted}
          onSetVolume={onSetVolume}
          onToggleMute={onToggleMute}
          snapshot={snapshot}
        />
      </div>
      <div className="vibe-player-controls__progress">
        <span className="vibe-player-controls__time">
          {formatTime(snapshot.currentTime)}
        </span>
        <VibePlayerTimeline
          currentTime={snapshot.currentTime}
          disabled={!(capabilities.canSeek && capabilities.supportsDuration)}
          duration={snapshot.duration}
          onSeek={onSeek}
          seekThumbnails={seekThumbnails}
        />
        <span className="vibe-player-controls__time">
          -{formatTime(remaining)}
        </span>
      </div>
      <div className="vibe-player-controls__options">
        <VibePlayerRateControl
          capabilities={capabilities}
          onSetPlaybackRate={onSetPlaybackRate}
          snapshot={snapshot}
        />
        <VibePlayerQualityControl
          capabilities={capabilities}
          onSetQuality={onSetQuality}
          qualityOptions={snapshot.qualityOptions}
        />
        <VibePlayerCaptionsControl
          capabilities={capabilities}
          captionsEnabled={captionsEnabled}
          onToggleCaptions={onToggleCaptions}
        />
        <VibePlayerFullscreenControl
          capabilities={capabilities}
          isFullscreen={snapshot.isFullscreen}
          onToggleFullscreen={onToggleFullscreen}
        />
        <VibePlayerPictureInPictureControl
          capabilities={capabilities}
          isPictureInPicture={snapshot.isPictureInPicture}
          onTogglePictureInPicture={onTogglePictureInPicture}
        />
      </div>
    </div>
  );
}
