import type { VibePlayerSeekThumbnail, VibePlayerSource } from "vibe-player";
import { bunnyDemoSource } from "./demo-bunny-source";
import { createPosterUrl } from "./demo-poster";
import {
  createSeekThumbnails,
  muxSeekSprite,
  sintelSeekSprite,
} from "./demo-seek-sprites";
import { demoYouTubeSources } from "./demo-youtube-sources";

export interface DemoSourceMeta {
  accent: string;
  capabilities: string[];
  description: string;
  label: string;
  sourceUrl: string;
  stack: string;
  title: string;
}

export interface DemoSourceItem {
  id: string;
  meta: DemoSourceMeta;
  seekThumbnails?: readonly VibePlayerSeekThumbnail[];
  source: VibePlayerSource;
}

const captionTrack = {
  default: true,
  id: "showcase-captions",
  kind: "captions" as const,
  label: "English",
  language: "en",
  url: "/captions/showcase.vtt",
};

export const demoSources: DemoSourceItem[] = [
  {
    id: "file",
    meta: {
      accent: "#e9563f",
      capabilities: [
        "Native file adapter",
        "Package captions",
        "Resume persistence",
        "Timeline and volume controls",
      ],
      description: "Progressive MP4 playback with native video underneath.",
      label: "File",
      sourceUrl: "https://media.w3.org/2010/05/sintel/trailer_hd.mp4",
      stack: "HTMLVideoElement adapter",
      title: "Progressive MP4",
    },
    seekThumbnails: createSeekThumbnails(sintelSeekSprite),
    source: {
      captions: [captionTrack],
      id: "vite-demo-file",
      posterUrl: createPosterUrl({
        accent: "#e9563f",
        base: "#12100f",
        horizon: "#201815",
        line: "#f6b55f",
      }),
      sources: [
        {
          mimeType: "video/mp4",
          url: "https://media.w3.org/2010/05/sintel/trailer_hd.mp4",
        },
      ],
      title: "Progressive MP4",
      type: "file",
    },
  },
  {
    id: "hls",
    meta: {
      accent: "#36c9a3",
      capabilities: [
        "Managed HLS loading",
        "Adaptive quality menu",
        "Package captions",
        "Resume persistence",
      ],
      description: "Adaptive HLS VOD loaded through native HLS or hls.js.",
      label: "HLS",
      sourceUrl: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
      stack: "HLS adapter",
      title: "Adaptive stream",
    },
    seekThumbnails: createSeekThumbnails(muxSeekSprite),
    source: {
      captions: [captionTrack],
      crossOrigin: "anonymous",
      id: "vite-demo-hls",
      manifestUrl: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
      posterUrl: createPosterUrl({
        accent: "#36c9a3",
        base: "#0c1311",
        horizon: "#10201c",
        line: "#e7d06a",
      }),
      title: "Adaptive stream",
      type: "hls",
    },
  },
  bunnyDemoSource,
  ...demoYouTubeSources,
];

export function getDemoSource(sourceId: string): DemoSourceItem {
  const source = demoSources.find((item) => item.id === sourceId);
  if (source) {
    return source;
  }
  const [fallback] = demoSources;
  if (!fallback) {
    throw new Error("At least one Vibe Player demo source is required.");
  }
  return fallback;
}
