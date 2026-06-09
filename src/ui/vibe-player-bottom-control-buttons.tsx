import type { ReactNode } from "react";
import {
  formatVibePlayerPlaybackRate,
  getNextVibePlayerPlaybackRate,
  type VibePlayerCapabilities,
  type VibePlayerSnapshot,
} from "../core";
import {
  CaptionsIcon,
  EnterFullscreenIcon,
  MuteIcon,
  PauseIcon,
  PictureInPictureIcon,
  PlayIcon,
  VolumeIcon,
} from "./vibe-player-icons";

interface VibePlayerToggleButtonProps {
  active?: boolean;
  children: ReactNode;
  label: string;
  onClick: () => void;
}

export function VibePlayerToggleButton({
  active,
  children,
  label,
  onClick,
}: VibePlayerToggleButtonProps) {
  return (
    <button
      aria-label={label}
      className="vibe-player-controls__button"
      data-active={active}
      onClick={onClick}
      title={label}
      type="button"
    >
      {children}
    </button>
  );
}

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
    <VibePlayerToggleButton label={label} onClick={onTogglePlay}>
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
    <VibePlayerToggleButton label={label} onClick={onToggleMute}>
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
    <button
      aria-label={`Playback speed ${rate}`}
      className="vibe-player-controls__rate"
      onClick={() =>
        onSetPlaybackRate(getNextVibePlayerPlaybackRate(snapshot.playbackRate))
      }
      title="Playback speed"
      type="button"
    >
      {rate}
    </button>
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
    >
      <CaptionsIcon />
    </VibePlayerToggleButton>
  );
}

interface VibePlayerFullscreenControlProps {
  capabilities: VibePlayerCapabilities;
  onToggleFullscreen: (() => void) | undefined;
}

export function VibePlayerFullscreenControl({
  capabilities,
  onToggleFullscreen,
}: VibePlayerFullscreenControlProps) {
  if (!(capabilities.canFullscreen && onToggleFullscreen)) {
    return null;
  }
  return (
    <VibePlayerToggleButton label="Full screen" onClick={onToggleFullscreen}>
      <EnterFullscreenIcon />
    </VibePlayerToggleButton>
  );
}

interface VibePlayerPictureInPictureControlProps {
  capabilities: VibePlayerCapabilities;
  onTogglePictureInPicture: (() => void) | undefined;
}

export function VibePlayerPictureInPictureControl({
  capabilities,
  onTogglePictureInPicture,
}: VibePlayerPictureInPictureControlProps) {
  if (!(capabilities.canPictureInPicture && onTogglePictureInPicture)) {
    return null;
  }
  return (
    <VibePlayerToggleButton
      label="Picture in picture"
      onClick={onTogglePictureInPicture}
    >
      <PictureInPictureIcon />
    </VibePlayerToggleButton>
  );
}
