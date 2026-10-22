import type { VibePlayerSeekThumbnail } from "vibe-player";

export const seekThumbnails = [
  {
    endTime: 6,
    sprite: { height: 90, width: 160, x: 0, y: 0 },
    startTime: 0,
    url: "/media/seek-sprite.jpg",
  },
  {
    endTime: 12,
    sprite: { height: 90, width: 160, x: 160, y: 0 },
    startTime: 6,
    url: "/media/seek-sprite.jpg",
  },
  { endTime: 18, startTime: 12, url: "/media/seek-frame.jpg" },
  {
    endTime: 24,
    sprite: { height: 90, width: 160, x: 160, y: 90 },
    startTime: 18,
    url: "/media/seek-sprite.jpg",
  },
] as const satisfies readonly VibePlayerSeekThumbnail[];
