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
  PictureInPictureIcon,
  VolumeIcon,
} from "./vibe-player-icons";
import {
  useVibePlayerPlaybackLabel,
  VibePlayerPlaybackIcon,
} from "./vibe-player-playback-label";
import { VibePlayerToggleButton } from "./vibe-player-toggle-button";
import { VibePlayerTooltip } from "./vibe-player-tooltip";
import { useVibePlayerUI, vibePlayerClassName } from "./vibe-player-ui-context";

interface VibePlayerPlaybackControlProps {
  onTogglePlay: () => void;
  snapshot: VibePlayerSnapshot;
}

export function VibePlayerPlaybackControl({
  onTogglePlay,
  snapshot,
}: VibePlayerPlaybackControlProps) {
  const { labels } = useVibePlayerUI();
  const label = useVibePlayerPlaybackLabel(snapshot);
  return (
    <VibePlayerToggleButton
      label={label}
      onClick={onTogglePlay}
      shortcut={labels.playShortcut}
      tooltipAlign="start"
    >
      <VibePlayerPlaybackIcon snapshot={snapshot} />
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
  const { labels } = useVibePlayerUI();
  if (!capabilities.supportsMute) {
    return null;
  }
  const label = snapshot.muted ? labels.unmute : labels.mute;
  return (
    <VibePlayerToggleButton
      label={label}
      onClick={onToggleMute}
      shortcut={labels.muteShortcut}
    >
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
  const { classNames, labels } = useVibePlayerUI();
  if (!capabilities.canSetPlaybackRate) {
    return null;
  }
  const rate = formatVibePlayerPlaybackRate(snapshot.playbackRate);
  return (
    <VibePlayerTooltip align="end" label={labels.playbackSpeed}>
      <button
        aria-label={labels.playbackSpeedValue(rate)}
        className={vibePlayerClassName(
          "vibe-player-controls__rate",
          classNames.button
        )}
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
  const { labels } = useVibePlayerUI();
  if (!(capabilities.canShowCaptions && onToggleCaptions)) {
    return null;
  }
  const label = captionsEnabled ? labels.hideCaptions : labels.showCaptions;
  return (
    <VibePlayerToggleButton
      active={captionsEnabled}
      label={label}
      onClick={onToggleCaptions}
      shortcut={labels.captionsShortcut}
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
  const { labels } = useVibePlayerUI();
  if (!(capabilities.canFullscreen && onToggleFullscreen)) {
    return null;
  }
  return (
    <VibePlayerToggleButton
      active={isFullscreen}
      label={isFullscreen ? labels.exitFullscreen : labels.fullscreen}
      onClick={onToggleFullscreen}
      shortcut={labels.fullscreenShortcut}
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
  const { labels } = useVibePlayerUI();
  if (!(capabilities.canPictureInPicture && onTogglePictureInPicture)) {
    return null;
  }
  return (
    <VibePlayerToggleButton
      active={isPictureInPicture}
      label={
        isPictureInPicture
          ? labels.exitPictureInPicture
          : labels.pictureInPicture
      }
      onClick={onTogglePictureInPicture}
      tooltipAlign="end"
    >
      <PictureInPictureIcon />
    </VibePlayerToggleButton>
  );
}
