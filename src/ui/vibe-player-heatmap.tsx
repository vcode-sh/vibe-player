import { useEffect, useMemo, useRef } from "react";
import {
  createVibePlayerHeatmapLine,
  findVibePlayerHeatmapPeaks,
  getVibePlayerHeatmapLevel,
  getVibePlayerHeatmapY,
  isNearVibePlayerHeatmapPeak,
  sampleVibePlayerHeatmap,
} from "./vibe-player-heatmap-geometry";
import { bindVibePlayerHeatmapPreview } from "./vibe-player-heatmap-preview";
import {
  useVibePlayerTimeline,
  useVibePlayerUI,
  vibePlayerClassName,
} from "./vibe-player-ui-context";

/** A "most replayed" graph for `timelineBackground`. */
export interface VibePlayerHeatmapProps {
  className?: string | undefined;
  /**
   * Duration fractions (0..1) the preview names `labels.mostReplayed`.
   * Defaults to the top three local maxima at or above `peakThreshold`,
   * ignoring the first 3 %.
   */
  peaks?: readonly number[] | undefined;
  /** Lowest value a detected peak may have; defaults to 0.6. */
  peakThreshold?: number | undefined;
  /**
   * Relative replay intensity for equal slices of the duration, first to
   * last, each normalized to 0..1 (typically 100). Out-of-range values are
   * clamped and non-finite ones read as 0. Fewer than two render nothing.
   */
  values: readonly number[];
  /**
   * Hidden at rest; shown while the timeline is hovered or scrubbed.
   * `glide` (default) draws a line left to right with a dot under the
   * pointer; `curve` raises a filled curve.
   */
  variant?: "curve" | "glide" | undefined;
}

/**
 * Draws replay intensity over the timeline and, above it, a preview of the
 * hovered moment: the seek frame when the player has `seekThumbnails`, the
 * time, and `labels.mostReplayed` near a peak or `labels.replayValue`.
 */
export function VibePlayerHeatmap({
  className,
  peaks,
  peakThreshold = 0.6,
  values,
  variant = "glide",
}: VibePlayerHeatmapProps) {
  const { formatTime, labels } = useVibePlayerUI();
  const timeline = useVibePlayerTimeline();
  const root = useRef<HTMLSpanElement>(null);
  const line = useMemo(() => createVibePlayerHeatmapLine(values), [values]);
  const named = useMemo(
    () => peaks ?? findVibePlayerHeatmapPeaks(values, peakThreshold),
    [peakThreshold, peaks, values]
  );
  useEffect(() => {
    const element = root.current;
    if (!(element && timeline)) {
      return;
    }
    const count = values.length;
    return bindVibePlayerHeatmapPreview(element, {
      ...timeline,
      formatTime,
      label: (fraction) =>
        isNearVibePlayerHeatmapPeak(named, fraction, count)
          ? labels.mostReplayed
          : labels.replayValue(
              getVibePlayerHeatmapLevel(
                values[Math.min(count - 1, Math.floor(fraction * count))]
              )
            ),
      y: (fraction) =>
        getVibePlayerHeatmapY(sampleVibePlayerHeatmap(values, fraction)),
    });
  }, [formatTime, labels, named, timeline, values]);
  if (!line) {
    return null;
  }
  return (
    <span
      aria-hidden
      className={vibePlayerClassName("vibe-player-heatmap", className)}
      data-part="heatmap"
      data-variant={variant}
      ref={root}
    >
      <span className="vibe-player-heatmap__graph">
        <HeatmapPath className="area" d={`${line} L100 100 L0 100Z`} />
        <HeatmapPath className="line" d={line} />
      </span>
      <span className="vibe-player-heatmap__rider">
        <span className="vibe-player-heatmap__dot" />
      </span>
      <span className="vibe-player-heatmap__preview">
        <span className="vibe-player-heatmap__frame" hidden>
          {/* biome-ignore lint/correctness/useImageSize: The preview sizes the image from the selected sprite tile. */}
          <img alt="" draggable={false} />
        </span>
        <span className="vibe-player-heatmap__chip">
          <span className="vibe-player-heatmap__time" />
          <span className="vibe-player-heatmap__label" />
        </span>
      </span>
    </span>
  );
}

function HeatmapPath({ className, d }: { className: string; d: string }) {
  return (
    <svg
      aria-hidden
      className={`vibe-player-heatmap__${className}`}
      focusable="false"
      preserveAspectRatio="none"
      viewBox="0 0 100 100"
    >
      <path d={d} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
