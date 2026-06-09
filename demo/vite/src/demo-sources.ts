import type { VibePlayerSource } from "@vibe-code/vibe-player";

interface PosterOptions {
  accent: string;
  base: string;
  horizon: string;
  line: string;
}

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

function createPosterUrl({ accent, base, horizon, line }: PosterOptions) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720">
      <rect width="1280" height="720" fill="${base}" />
      <path d="M0 500h1280v220H0z" fill="${horizon}" />
      <path d="M120 180h460l-96 360H24z" fill="${accent}" opacity=".86" />
      <path d="M760 128h360l120 412H640z" fill="${line}" opacity=".78" />
      <path d="M230 234h234M198 314h244M166 394h256" stroke="#fff" stroke-width="16" stroke-linecap="round" opacity=".62" />
      <path d="M790 230h250M824 314h250M858 398h250" stroke="#050506" stroke-width="18" stroke-linecap="round" opacity=".52" />
    </svg>
  `;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

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
  {
    id: "youtube",
    meta: {
      accent: "#ed4a64",
      capabilities: [
        "YouTube iframe adapter",
        "Seek and playback bridge",
        "Provider-safe controls",
        "Normalized analytics",
      ],
      description: "YouTube iframe playback using the same package shell.",
      label: "YouTube",
      sourceUrl: "https://www.youtube.com/watch?v=M7lc1UVf-VE",
      stack: "YouTube iframe adapter",
      title: "Embedded provider",
    },
    source: {
      id: "vite-demo-youtube",
      startSeconds: 2,
      title: "Embedded provider",
      type: "youtube",
      youtubeVideoId: "M7lc1UVf-VE",
    },
  },
  {
    id: "youtube-headless",
    meta: {
      accent: "#ff0033",
      capabilities: [
        "No YouTube iframe",
        "Package-owned preview",
        "External YouTube handoff",
        "No fake playback controls",
      ],
      description:
        "A compliant headless-style YouTube handoff without embedded playback.",
      label: "YT Headless",
      sourceUrl: "https://www.youtube.com/watch?v=M7lc1UVf-VE&t=2s",
      stack: "YouTube external presentation",
      title: "Headless handoff",
    },
    source: {
      externalActionLabel: "Watch on YouTube",
      id: "vite-demo-youtube-headless",
      posterUrl: createPosterUrl({
        accent: "#ff0033",
        base: "#111113",
        horizon: "#1b1b20",
        line: "#f1f1f1",
      }),
      presentation: "external",
      startSeconds: 2,
      title: "Headless handoff",
      type: "youtube",
      youtubeVideoId: "M7lc1UVf-VE",
    },
  },
];

export function getDemoSource(sourceId: string): DemoSourceItem {
  const source = demoSources.find((item) => item.id === sourceId);
  if (source) {
    return source;
  }
  const fallback = demoSources[0];
  if (!fallback) {
    throw new Error("At least one Vibe Player demo source is required.");
  }
  return fallback;
}
