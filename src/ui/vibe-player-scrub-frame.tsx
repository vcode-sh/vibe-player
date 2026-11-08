import { useEffect, useRef } from "react";
import { bindVibePlayerFramePreview } from "./vibe-player-frame-preview";
import type { VibePlayerTimelinePreview } from "./vibe-player-timeline-preview";
import { useVibePlayerUI } from "./vibe-player-ui-context";

interface VibePlayerScrubFrameProps {
  duration: number;
  preview: VibePlayerTimelinePreview;
}

/**
 * The compact scrub readout with `seekThumbnails`: the seek frame above the
 * previewed time, shown on hover, scrub and keyboard seek in place of the
 * skin's time bubble. A `VibePlayerHeatmap` in the same track draws its own
 * preview instead, so the stylesheet hides this one there.
 */
export function VibePlayerScrubFrame({
  duration,
  preview,
}: VibePlayerScrubFrameProps) {
  const { formatTime, seekThumbnails } = useVibePlayerUI();
  const root = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const element = root.current;
    if (!element) {
      return;
    }
    return bindVibePlayerFramePreview(element, "vibe-player-scrub-frame", {
      duration,
      formatTime,
      preview,
      seekThumbnails,
    });
  }, [duration, formatTime, preview, seekThumbnails]);
  return (
    <span
      aria-hidden
      className="vibe-player-scrub-frame"
      data-part="scrub-frame"
      ref={root}
    >
      <span className="vibe-player-scrub-frame__preview">
        <span className="vibe-player-scrub-frame__frame" hidden>
          {/* biome-ignore lint/correctness/useImageSize: The preview sizes the image from the selected sprite tile. */}
          <img alt="" draggable={false} />
        </span>
        <span className="vibe-player-scrub-frame__time" />
      </span>
    </span>
  );
}
