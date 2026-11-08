import { vibePlayerClassName } from "./vibe-player-ui-context";

/** A "most replayed" graph for `timelineBackground`. */
export interface VibePlayerHeatmapProps {
  className?: string | undefined;
  /**
   * Relative replay intensity for equal slices of the duration, first to
   * last, each normalized to 0..1. Out-of-range values are clamped and
   * non-finite ones read as 0. Fewer than two values render nothing.
   */
  values: readonly number[];
}

const width = 1000;
const height = 100;

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

function intensity(value: number): number {
  return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;
}

/**
 * A closed area under a curve through each slice's centre, smoothed with
 * quadratic segments between midpoints and held flat to both edges.
 */
export function createVibePlayerHeatmapPath(values: readonly number[]): string {
  const points = values.map((value, index) => ({
    x: round(((index + 0.5) / values.length) * width),
    y: round(height - intensity(value) * height),
  }));
  const [first] = points;
  const last = points.at(-1);
  if (!(first && last) || points.length < 2) {
    return "";
  }
  const segments = [`M0 ${height}`, `L0 ${first.y}`, `L${first.x} ${first.y}`];
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const point = points[index];
    if (previous && point) {
      const midX = round((previous.x + point.x) / 2);
      const midY = round((previous.y + point.y) / 2);
      segments.push(`Q${previous.x} ${previous.y} ${midX} ${midY}`);
    }
  }
  segments.push(
    `L${last.x} ${last.y}`,
    `L${width} ${last.y}`,
    `L${width} ${height}Z`
  );
  return segments.join(" ");
}

/**
 * Draws replay intensity across the whole timeline width. Colour and height
 * follow `--vibe-player-heatmap-color` and the timeline background layer.
 */
export function VibePlayerHeatmap({
  className,
  values,
}: VibePlayerHeatmapProps) {
  const path = createVibePlayerHeatmapPath(values);
  if (!path) {
    return null;
  }
  return (
    <svg
      aria-hidden
      className={vibePlayerClassName("vibe-player-heatmap", className)}
      data-part="heatmap"
      focusable="false"
      preserveAspectRatio="none"
      viewBox={`0 0 ${width} ${height}`}
    >
      <path d={path} />
    </svg>
  );
}
