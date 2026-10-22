import type { VibePlayerSeekThumbnail } from "vibe-player";

/**
 * Bunny Stream publishes seek previews as numbered sprite sheets at
 * `{videoUrl}/seek/_N.jpg`: a 6x6 grid of 300px-wide frames, one frame every
 * 2 s (1 s below 10 s). Bunny publishes no time map, so it is derived here.
 */
export interface BunnySeekSheets {
  /** Media duration in seconds, as reported by ffprobe. */
  duration: number;
  /** Cell height in pixels; 168 for 16:9 video. */
  frameHeight: number;
  /** Video folder on the pull zone, without a trailing slash. */
  videoUrl: string;
}

const columns = 6;
const framesPerSheet = columns * columns;
const frameWidth = 300;

function getBunnySeekInterval(duration: number): number {
  return duration < 10 ? 1 : 2;
}

export function createBunnySeekThumbnails({
  duration,
  frameHeight,
  videoUrl,
}: BunnySeekSheets): VibePlayerSeekThumbnail[] {
  const interval = getBunnySeekInterval(duration);
  const count = Math.ceil(duration / interval);
  return Array.from({ length: count }, (_, n) => {
    const cell = n % framesPerSheet;
    return {
      endTime: Math.min((n + 1) * interval, duration),
      sprite: {
        height: frameHeight,
        width: frameWidth,
        x: (cell % columns) * frameWidth,
        y: Math.floor(cell / columns) * frameHeight,
      },
      startTime: n * interval,
      url: `${videoUrl}/seek/_${Math.floor(n / framesPerSheet)}.jpg`,
    };
  });
}
