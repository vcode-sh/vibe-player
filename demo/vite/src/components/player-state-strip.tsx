import type { VibePlayerControllerState } from "@vibe-code/vibe-player";
import type { DemoSourceItem } from "../demo-sources";

interface PlayerStateStripProps {
  activeSource: DemoSourceItem;
  playerState: VibePlayerControllerState | null;
}

interface PlayerStateMetric {
  label: string;
  value: string;
}

function formatSeconds(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return "0.0s";
  }
  return `${seconds.toFixed(1)}s`;
}

function getSupportedControlCount(
  playerState: VibePlayerControllerState | null
): number {
  const capabilities = playerState?.capabilities;
  if (!capabilities) {
    return 0;
  }
  const supported = [
    capabilities.canSeek,
    capabilities.supportsVolumeControl,
    capabilities.canSetPlaybackRate,
    capabilities.canShowCaptions,
    capabilities.supportsQualitySelection,
    capabilities.canPictureInPicture,
  ];
  return supported.filter(Boolean).length;
}

function getQualityLabel(
  playerState: VibePlayerControllerState | null
): string {
  const selectedQuality = playerState?.snapshot.qualityOptions?.find(
    (option) => option.selected
  );
  return selectedQuality?.label ?? "auto";
}

function getPlaybackLabel(
  playerState: VibePlayerControllerState | null
): string {
  if (!playerState) {
    return "mounting";
  }
  if (playerState.playbackBlocked) {
    return "blocked";
  }
  return playerState.snapshot.paused ? "paused" : "playing";
}

function getStateMetrics({
  activeSource,
  playerState,
}: PlayerStateStripProps): PlayerStateMetric[] {
  return [
    {
      label: "Status",
      value: playerState?.snapshot.readyState ?? "mounting",
    },
    {
      label: "Playback",
      value: getPlaybackLabel(playerState),
    },
    {
      label: "Time",
      value: playerState
        ? `${formatSeconds(playerState.snapshot.currentTime)} / ${formatSeconds(playerState.snapshot.duration)}`
        : "0.0s / 0.0s",
    },
    {
      label: "Controls",
      value: `${getSupportedControlCount(playerState)} active`,
    },
    {
      label: "Quality",
      value:
        activeSource.source.type === "hls"
          ? getQualityLabel(playerState)
          : "source",
    },
  ];
}

export function PlayerStateStrip({
  activeSource,
  playerState,
}: PlayerStateStripProps) {
  const metrics = getStateMetrics({ activeSource, playerState });

  return (
    <dl aria-label="Live player state" className="vp-player-state-strip">
      {metrics.map((metric) => (
        <div className="vp-player-state-strip__item" key={metric.label}>
          <dt>{metric.label}</dt>
          <dd>{metric.value}</dd>
        </div>
      ))}
    </dl>
  );
}
