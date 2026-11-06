import { selectVibePlayerSeekThumbnail } from "./select-vibe-player-seek-thumbnail";
import { VibePlayerSeekThumbnailImage } from "./vibe-player-seek-thumbnail";
import type { VibePlayerSeekThumbnail } from "./vibe-player-seek-thumbnail-types";
import { useVibePlayerUI } from "./vibe-player-ui-context";

interface VibePlayerSeekPreviewProps {
  duration: number;
  percent: number;
  seekThumbnails: readonly VibePlayerSeekThumbnail[] | undefined;
  time: number;
}

export function VibePlayerSeekPreview({
  duration,
  percent,
  seekThumbnails,
  time,
}: VibePlayerSeekPreviewProps) {
  const { formatTime, labels } = useVibePlayerUI();
  const thumbnail = selectVibePlayerSeekThumbnail(
    seekThumbnails,
    time,
    duration
  );
  return (
    <output
      className="vibe-player-timeline__tooltip"
      style={{
        left: `clamp(0px, calc(${percent}% - var(--vibe-player-seek-preview-width) / 2), max(0px, calc(100% - var(--vibe-player-seek-preview-width))))`,
      }}
    >
      {thumbnail ? (
        <VibePlayerSeekThumbnailImage
          key={thumbnail.url}
          thumbnail={thumbnail}
        />
      ) : null}
      <span className="vibe-player-timeline__tooltip-label">{labels.seek}</span>
      <span className="vibe-player-timeline__tooltip-time">
        {formatTime(time)}
      </span>
      <span className="vibe-player-timeline__tooltip-shortcut">
        {labels.seekShortcut}
      </span>
    </output>
  );
}
