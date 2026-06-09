import {
  formatVibePlayerTime,
  type VibePlayerCapabilities,
  type VibePlayerSnapshot,
} from "../core";
import {
  VibePlayerCaptionsControl,
  VibePlayerFullscreenControl,
  VibePlayerMuteControl,
  VibePlayerPictureInPictureControl,
  VibePlayerPlaybackControl,
  VibePlayerRateControl,
} from "./vibe-player-bottom-control-buttons";
import { getVibePlayerChromeClassName } from "./vibe-player-control-chrome";
import { VibePlayerQualityControl } from "./vibe-player-quality-control";
import { VibePlayerTimeline } from "./vibe-player-timeline";

export interface VibePlayerBottomControlsProps {
  capabilities: VibePlayerCapabilities;
  captionsEnabled: boolean;
  chromeHidden: boolean;
  onSeek: (seconds: number) => void;
  onSetPlaybackRate: (rate: number) => void;
  onSetQuality: ((qualityId: string) => void) | undefined;
  onToggleCaptions: (() => void) | undefined;
  onToggleFullscreen: (() => void) | undefined;
  onToggleMute: () => void;
  onTogglePictureInPicture: (() => void) | undefined;
  onTogglePlay: () => void;
  snapshot: VibePlayerSnapshot;
}

export function VibePlayerBottomControls({
  capabilities,
  captionsEnabled,
  chromeHidden,
  onSeek,
  onSetPlaybackRate,
  onSetQuality,
  onToggleCaptions,
  onToggleFullscreen,
  onToggleMute,
  onTogglePictureInPicture,
  onTogglePlay,
  snapshot,
}: VibePlayerBottomControlsProps) {
  const remaining = Math.max(0, snapshot.duration - snapshot.currentTime);
  return (
    <div
      aria-hidden={chromeHidden}
      className={`vibe-player-controls__bottom ${getVibePlayerChromeClassName(chromeHidden, "bottom")}`}
      inert={chromeHidden ? true : undefined}
    >
      <VibePlayerPlaybackControl
        onTogglePlay={onTogglePlay}
        snapshot={snapshot}
      />
      <VibePlayerMuteControl
        capabilities={capabilities}
        onToggleMute={onToggleMute}
        snapshot={snapshot}
      />
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
        onToggleFullscreen={onToggleFullscreen}
      />
      <VibePlayerPictureInPictureControl
        capabilities={capabilities}
        onTogglePictureInPicture={onTogglePictureInPicture}
      />
    </div>
  );
}
