import type Hls from "hls.js";

/** The live edge moves a little before `seeking` fires. */
const syncToleranceSeconds = 0.5;

/**
 * Whether a seek to `time` is hls.js catching up to the live edge. hls.js
 * only seeks to `liveSyncPosition` on a live playlist, and only when the
 * playhead was outside the sliding window or further behind the edge than
 * the configured maximum latency, so a viewer seek to the edge from inside
 * the window is not one. `from` is the last position playback reported
 * before the seek, or null when it reported none yet.
 */
export function isHlsLiveCatchUp(
  hls: Hls,
  time: number,
  from: number | null
): boolean {
  const details = hls.latestLevelDetails;
  const sync = hls.liveSyncPosition;
  if (
    details?.live !== true ||
    typeof sync !== "number" ||
    Math.abs(sync - time) > syncToleranceSeconds
  ) {
    return false;
  }
  if (from === null) {
    return true;
  }
  const tolerance = readFinite(hls.config?.maxFragLookUpTolerance) ?? 0;
  if (from < details.fragmentStart - tolerance || from > details.edge) {
    return true;
  }
  const maxLatency = readMaxLatency(hls, details.targetduration);
  return maxLatency !== null && from < details.edge - maxLatency;
}

function readMaxLatency(hls: Hls, targetDuration: number): number | null {
  const { config } = hls;
  const duration = readFinite(config?.liveMaxLatencyDuration);
  if (duration !== null) {
    return duration;
  }
  return readFinite(config?.liveMaxLatencyDurationCount * targetDuration);
}

function readFinite(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
