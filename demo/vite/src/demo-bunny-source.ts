import type { VibePlayerSource } from "vibe-player";
import { createBunnySeekThumbnails } from "./demo-bunny-seek-thumbnails";

const videoUrl =
  "https://vz-f36e7fb4-6a5.b-cdn.net/acbf86bc-a6b3-424f-a282-7c16b25ab4eb";
const manifestUrl = `${videoUrl}/playlist.m3u8`;

export const bunnyDemoSource = {
  id: "bunny",
  meta: {
    accent: "#f7931e",
    capabilities: [
      "Bunny Stream delivery",
      "Adaptive HLS playback",
      "720p, 1080p and 1440p renditions",
      "Resume persistence",
    ],
    description: "Bunny Stream HLS playback through the shared player adapter.",
    label: "Bunny Stream",
    sourceUrl: manifestUrl,
    stack: "HLS adapter",
    title: "Bunny Stream demo",
  },
  seekThumbnails: createBunnySeekThumbnails({
    duration: 137.366_667,
    frameHeight: 168,
    videoUrl,
  }),
  source: {
    crossOrigin: "anonymous",
    id: "vite-demo-bunny",
    manifestUrl,
    title: "Bunny Stream demo",
    type: "hls",
  } satisfies VibePlayerSource,
};
