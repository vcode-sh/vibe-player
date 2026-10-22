import type { VibePlayerSeekThumbnail } from "vibe-player";

/**
 * Sprite sheet layout shared by the generator script and the demo sources.
 * Frame `n` is captured at the middle of `[n * interval, (n + 1) * interval)`.
 */
export interface DemoSeekSprite {
  columns: number;
  /** Media duration in seconds, as reported by ffprobe. */
  duration: number;
  frameHeight: number;
  frameWidth: number;
  /** Media URL the frames are extracted from. */
  input: string;
  interval: number;
  /** Public path of the generated sheet, relative to `demo/vite/public`. */
  url: string;
}

export const sintelSeekSprite = {
  columns: 9,
  duration: 52.208_333,
  frameHeight: 180,
  frameWidth: 320,
  input: "https://media.w3.org/2010/05/sintel/trailer_hd.mp4",
  interval: 2,
  url: "/seek/sintel-trailer.jpg",
} as const satisfies DemoSeekSprite;

// The 512x288 rendition is the cheapest exact 16:9 variant of the Mux stream.
export const muxSeekSprite = {
  columns: 8,
  duration: 634.634,
  frameHeight: 180,
  frameWidth: 320,
  input:
    "https://test-streams.mux.dev/x36xhzz/url_4/193039199_mp4_h264_aac_7.m3u8",
  interval: 10,
  url: "/seek/mux-big-buck-bunny.jpg",
} as const satisfies DemoSeekSprite;

export const demoSeekSprites: readonly DemoSeekSprite[] = [
  sintelSeekSprite,
  muxSeekSprite,
];

// A trailing partial interval whose midpoint lies past the end yields no frame,
// so it is folded into the last captured frame.
export function getSeekSpriteFrameCount(sprite: DemoSeekSprite): number {
  return Math.max(1, Math.round(sprite.duration / sprite.interval));
}

export function createSeekThumbnails(
  sprite: DemoSeekSprite
): VibePlayerSeekThumbnail[] {
  const { columns, duration, frameHeight, frameWidth, interval, url } = sprite;
  const count = getSeekSpriteFrameCount(sprite);
  return Array.from({ length: count }, (_, n) => ({
    endTime: n === count - 1 ? duration : (n + 1) * interval,
    sprite: {
      height: frameHeight,
      width: frameWidth,
      x: (n % columns) * frameWidth,
      y: Math.floor(n / columns) * frameHeight,
    },
    startTime: n * interval,
    url,
  }));
}
