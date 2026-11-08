/**
 * Heatmap geometry in a 100 × 100 view box: one value per equal slice of the
 * duration, drawn through each slice's centre as a Catmull-Rom curve and held
 * flat to both edges. The top 8 units stay free for the line's stroke.
 */
const top = 8;
/** The opening seconds are always replayed; never call them a peak. */
const peakStart = 0.03;
const peakLimit = 3;

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

export function getVibePlayerHeatmapLevel(value: number | undefined): number {
  return value !== undefined && Number.isFinite(value)
    ? Math.min(1, Math.max(0, value))
    : 0;
}

/** Vertical position (0 top, 100 bottom) of a 0..1 level. */
export function getVibePlayerHeatmapY(level: number): number {
  return top + (100 - top) * (1 - level);
}

/** Uniform Catmull-Rom between `b` and `c`, with neighbours `a` and `d`. */
function catmullRom(a: number, b: number, c: number, d: number, t: number) {
  return (
    0.5 *
    (2 * b +
      (c - a) * t +
      (2 * a - 5 * b + 4 * c - d) * t * t +
      (3 * b - a - 3 * c + d) * t * t * t)
  );
}

/** The open line through every slice; empty for fewer than two values. */
export function createVibePlayerHeatmapLine(values: readonly number[]): string {
  const count = values.length;
  if (count < 2) {
    return "";
  }
  const x = (index: number) => round(((index + 0.5) / count) * 100);
  const y = (index: number) =>
    getVibePlayerHeatmapY(
      getVibePlayerHeatmapLevel(values[Math.min(count - 1, Math.max(0, index))])
    );
  const step = 100 / count / 3;
  const segments = [`M0 ${round(y(0))}`, `L${x(0)} ${round(y(0))}`];
  for (let index = 0; index < count - 1; index += 1) {
    const from = x(index);
    const c1 = round(y(index) + (y(index + 1) - y(index - 1)) / 6);
    const c2 = round(y(index + 1) - (y(index + 2) - y(index)) / 6);
    segments.push(
      `C${round(from + step)} ${c1} ${round(from + 2 * step)} ${c2} ${x(index + 1)} ${round(y(index + 1))}`
    );
  }
  segments.push(`L100 ${round(y(count - 1))}`);
  return segments.join(" ");
}

/** The line's level (0..1, may overshoot slightly) at a duration fraction. */
export function sampleVibePlayerHeatmap(
  values: readonly number[],
  fraction: number
): number {
  const count = values.length;
  const position = Math.min(count - 1, Math.max(0, fraction * count - 0.5));
  const index = Math.min(count - 2, Math.floor(position));
  const level = (at: number) =>
    getVibePlayerHeatmapLevel(values[Math.min(count - 1, Math.max(0, at))]);
  return catmullRom(
    level(index - 1),
    level(index),
    level(index + 1),
    level(index + 2),
    position - index
  );
}

/**
 * Duration fractions of the highest local maxima at or above `threshold`
 * (top three), skipping the first 3 %.
 */
export function findVibePlayerHeatmapPeaks(
  values: readonly number[],
  threshold: number
): number[] {
  const count = values.length;
  const peaks: Array<{ at: number; level: number }> = [];
  for (let index = 0; index < count; index += 1) {
    const level = getVibePlayerHeatmapLevel(values[index]);
    const at = (index + 0.5) / count;
    const previous = getVibePlayerHeatmapLevel(values[index - 1]);
    const next = getVibePlayerHeatmapLevel(values[index + 1]);
    if (
      at >= peakStart &&
      level >= threshold &&
      level > previous &&
      level >= next
    ) {
      peaks.push({ at, level });
    }
  }
  return peaks
    .sort((a, b) => b.level - a.level)
    .slice(0, peakLimit)
    .map((peak) => peak.at);
}

/** True within 2 % of a peak, or half a slice when slices are wider. */
export function isNearVibePlayerHeatmapPeak(
  peaks: readonly number[],
  fraction: number,
  count: number
): boolean {
  const reach = Math.max(0.02, 0.5 / count);
  return peaks.some((peak) => Math.abs(peak - fraction) <= reach);
}
