import {
  formatVibePlayerPlaybackRate,
  getNextVibePlayerPlaybackRate,
  type VibePlayerCapabilities,
  type VibePlayerSnapshot,
} from "../core";
import {
  CaptionsIcon,
  EnterFullscreenIcon,
  ExitFullscreenIcon,
  MuteIcon,
  PauseIcon,
  PictureInPictureIcon,
  PlayIcon,
  VolumeIcon,
} from "./vibe-player-icons";
import { VibePlayerToggleButton } from "./vibe-player-toggle-button";
import { VibePlayerTooltip } from "./vibe-player-tooltip";

interface VibePlayerPlaybackControlProps {
  onTogglePlay: () => void;
  snapshot: VibePlayerSnapshot;
}

export function VibePlayerPlaybackControl({
  onTogglePlay,
  snapshot,
}: VibePlayerPlaybackControlProps) {
  const label = snapshot.paused ? "Play" : "Pause";
  return (
    <VibePlayerToggleButton
      label={label}
      onClick={onTogglePlay}
      shortcut="Space / K"
      tooltipAlign="start"
    >
      {snapshot.paused ? <PlayIcon /> : <PauseIcon />}
    </VibePlayerToggleButton>
  );
}

interface VibePlayerMuteControlProps {
  capabilities: VibePlayerCapabilities;
  onToggleMute: () => void;
  snapshot: VibePlayerSnapshot;
}

export function VibePlayerMuteControl({
  capabilities,
  onToggleMute,
  snapshot,
}: VibePlayerMuteControlProps) {
  if (!capabilities.supportsMute) {
    return null;
  }
  const label = snapshot.muted ? "Unmute" : "Mute";
  return (
    <VibePlayerToggleButton label={label} onClick={onToggleMute} shortcut="M">
      {snapshot.muted ? <MuteIcon /> : <VolumeIcon />}
    </VibePlayerToggleButton>
  );
}

interface VibePlayerRateControlProps {
  capabilities: VibePlayerCapabilities;
  onSetPlaybackRate: (rate: number) => void;
  snapshot: VibePlayerSnapshot;
}

export function VibePlayerRateControl({
  capabilities,
  onSetPlaybackRate,
  snapshot,
}: VibePlayerRateControlProps) {
  if (!capabilities.canSetPlaybackRate) {
    return null;
  }
  const rate = formatVibePlayerPlaybackRate(snapshot.playbackRate);
  return (
    <VibePlayerTooltip label="Playback speed">
      <button
        aria-label={`Playback speed ${rate}`}
        className="vibe-player-controls__rate"
        onClick={() =>
          onSetPlaybackRate(
            getNextVibePlayerPlaybackRate(
              snapshot.playbackRate,
              snapshot.playbackRates
            )
          )
        }
        type="button"
      >
        {rate}
      </button>
    </VibePlayerTooltip>
  );
}

interface VibePlayerCaptionsControlProps {
  capabilities: VibePlayerCapabilities;
  captionsEnabled: boolean;
  onToggleCaptions: (() => void) | undefined;
}

export function VibePlayerCaptionsControl({
  capabilities,
  captionsEnabled,
  onToggleCaptions,
}: VibePlayerCaptionsControlProps) {
  if (!(capabilities.canShowCaptions && onToggleCaptions)) {
    return null;
  }
  const label = captionsEnabled ? "Hide captions" : "Show captions";
  return (
    <VibePlayerToggleButton
      active={captionsEnabled}
      label={label}
      onClick={onToggleCaptions}
      shortcut="C"
    >
      <CaptionsIcon />
    </VibePlayerToggleButton>
  );
}

interface VibePlayerFullscreenControlProps {
  capabilities: VibePlayerCapabilities;
  isFullscreen?: boolean | undefined;
  onToggleFullscreen: (() => void) | undefined;
}

export function VibePlayerFullscreenControl({
  capabilities,
  isFullscreen = false,
  onToggleFullscreen,
}: VibePlayerFullscreenControlProps) {
  if (!(capabilities.canFullscreen && onToggleFullscreen)) {
    return null;
  }
  return (
    <VibePlayerToggleButton
      active={isFullscreen}
      label={isFullscreen ? "Exit full screen" : "Full screen"}
      onClick={onToggleFullscreen}
      shortcut="F"
      tooltipAlign="end"
    >
      {isFullscreen ? <ExitFullscreenIcon /> : <EnterFullscreenIcon />}
    </VibePlayerToggleButton>
  );
}

interface VibePlayerPictureInPictureControlProps {
  capabilities: VibePlayerCapabilities;
  isPictureInPicture?: boolean | undefined;
  onTogglePictureInPicture: (() => void) | undefined;
}

export function VibePlayerPictureInPictureControl({
  capabilities,
  isPictureInPicture = false,
  onTogglePictureInPicture,
}: VibePlayerPictureInPictureControlProps) {
  if (!(capabilities.canPictureInPicture && onTogglePictureInPicture)) {
    return null;
  }
  return (
    <VibePlayerToggleButton
      active={isPictureInPicture}
      label={
        isPictureInPicture ? "Exit picture in picture" : "Picture in picture"
      }
      onClick={onTogglePictureInPicture}
      tooltipAlign="end"
    >
      <PictureInPictureIcon />
    </VibePlayerToggleButton>
  );
}
