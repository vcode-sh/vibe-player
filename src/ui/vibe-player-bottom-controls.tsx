import type { ReactNode } from "react";
import {
  formatVibePlayerPlaybackRate,
  formatVibePlayerTime,
  getNextVibePlayerPlaybackRate,
  type VibePlayerCapabilities,
  type VibePlayerSnapshot,
} from "../core";
import { getVibePlayerChromeClassName } from "./vibe-player-control-chrome";
import {
  CaptionsIcon,
  EnterFullscreenIcon,
  MuteIcon,
  PauseIcon,
  PictureInPictureIcon,
  PlayIcon,
  VolumeIcon,
} from "./vibe-player-icons";
import { VibePlayerTimeline } from "./vibe-player-timeline";

export interface VibePlayerBottomControlsProps {
  capabilities: VibePlayerCapabilities;
  captionsEnabled: boolean;
  chromeHidden: boolean;
  onSeek: (seconds: number) => void;
  onSetPlaybackRate: (rate: number) => void;
  onToggleCaptions: (() => void) | undefined;
  onToggleFullscreen: (() => void) | undefined;
  onToggleMute: () => void;
  onTogglePictureInPicture: (() => void) | undefined;
  onTogglePlay: () => void;
  snapshot: VibePlayerSnapshot;
}

interface VibePlayerToggleButtonProps {
  active?: boolean;
  children: ReactNode;
  label: string;
  onClick: () => void;
}

function VibePlayerToggleButton({
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

function VibePlayerMuteControl({
  capabilities,
  onToggleMute,
  snapshot,
}: Pick<
  VibePlayerBottomControlsProps,
  "capabilities" | "onToggleMute" | "snapshot"
>) {
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

function VibePlayerRateControl({
  capabilities,
  onSetPlaybackRate,
  snapshot,
}: Pick<
  VibePlayerBottomControlsProps,
  "capabilities" | "onSetPlaybackRate" | "snapshot"
>) {
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

function VibePlayerCaptionsControl({
  capabilities,
  captionsEnabled,
  onToggleCaptions,
}: Pick<
  VibePlayerBottomControlsProps,
  "capabilities" | "captionsEnabled" | "onToggleCaptions"
>) {
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

function VibePlayerFullscreenControl({
  capabilities,
  onToggleFullscreen,
}: Pick<VibePlayerBottomControlsProps, "capabilities" | "onToggleFullscreen">) {
  if (!(capabilities.canFullscreen && onToggleFullscreen)) {
    return null;
  }
  return (
    <VibePlayerToggleButton label="Full screen" onClick={onToggleFullscreen}>
      <EnterFullscreenIcon />
    </VibePlayerToggleButton>
  );
}

function VibePlayerPictureInPictureControl({
  capabilities,
  onTogglePictureInPicture,
}: Pick<
  VibePlayerBottomControlsProps,
  "capabilities" | "onTogglePictureInPicture"
>) {
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

export function VibePlayerBottomControls({
  capabilities,
  captionsEnabled,
  chromeHidden,
  onSeek,
  onSetPlaybackRate,
  onToggleCaptions,
  onToggleFullscreen,
  onToggleMute,
  onTogglePictureInPicture,
  onTogglePlay,
  snapshot,
}: VibePlayerBottomControlsProps) {
  const playLabel = snapshot.paused ? "Play" : "Pause";
  const remaining = Math.max(0, snapshot.duration - snapshot.currentTime);
  return (
    <div
      aria-hidden={chromeHidden}
      className={`vibe-player-controls__bottom ${getVibePlayerChromeClassName(chromeHidden, "bottom")}`}
      inert={chromeHidden ? true : undefined}
    >
      <VibePlayerToggleButton label={playLabel} onClick={onTogglePlay}>
        {snapshot.paused ? <PlayIcon /> : <PauseIcon />}
      </VibePlayerToggleButton>
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
