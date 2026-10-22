import {
  formatVibePlayerTime,
  type VibePlayerCapabilities,
  type VibePlayerSnapshot,
} from "../core";
import {
  VibePlayerCaptionsControl,
  VibePlayerFullscreenControl,
  VibePlayerPictureInPictureControl,
  VibePlayerPlaybackControl,
  VibePlayerRateControl,
} from "./vibe-player-bottom-control-buttons";
import { getVibePlayerChromeClassName } from "./vibe-player-control-chrome";
import { VibePlayerQualityControl } from "./vibe-player-quality-control";
import type { VibePlayerSeekThumbnail } from "./vibe-player-seek-thumbnail-types";
import { VibePlayerTimeline } from "./vibe-player-timeline";
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
  onToggleCaptions: (() => void) | undefined;
  onToggleFullscreen: (() => void) | undefined;
  onToggleMute: () => void;
  onTogglePictureInPicture: (() => void) | undefined;
  onTogglePlay: () => void;
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
  onToggleCaptions,
  onToggleFullscreen,
  onToggleMute,
  onTogglePictureInPicture,
  onTogglePlay,
  seekThumbnails,
  snapshot,
}: VibePlayerBottomControlsProps) {
  const remaining = Math.max(0, snapshot.duration - snapshot.currentTime);
  return (
    <div
      aria-hidden={chromeHidden}
      className={`vibe-player-controls__bottom ${getVibePlayerChromeClassName(chromeHidden, "bottom")}`}
      inert={chromeHidden ? true : undefined}
    >
      <div className="vibe-player-controls__playback">
        <VibePlayerPlaybackControl
          onTogglePlay={onTogglePlay}
          snapshot={snapshot}
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
          {formatVibePlayerTime(snapshot.currentTime)}
        </span>
        <VibePlayerTimeline
          currentTime={snapshot.currentTime}
          disabled={!(capabilities.canSeek && capabilities.supportsDuration)}
          duration={snapshot.duration}
          onSeek={onSeek}
          seekThumbnails={seekThumbnails}
        />
        <span className="vibe-player-controls__time">
          -{formatVibePlayerTime(remaining)}
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
