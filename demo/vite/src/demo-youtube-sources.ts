import { createPosterUrl } from "./demo-poster";
import type { DemoSourceItem } from "./demo-sources";

const sampleUrl = "https://www.youtube.com/watch?v=M7lc1UVf-VE";
const captionedVideoId = "8S0FDjFBj8o";

export const demoYouTubeSources: DemoSourceItem[] = [
  {
    id: "youtube",
    meta: {
      accent: "#ed4a64",
      capabilities: [
        "Official YouTube iframe",
        "Package controls outside the video",
        "Seek, volume and supported speeds",
        "No custom caption or quality menu",
      ],
      description:
        "Embedded YouTube playback driven by package controls below the video.",
      label: "YouTube",
      sourceUrl: sampleUrl,
      stack: "YouTube iframe, custom controls",
      title: "Embedded custom controls",
    },
    source: {
      id: "vite-demo-youtube",
      startSeconds: 2,
      title: "Embedded custom controls",
      type: "youtube",
      youtubeVideoId: "M7lc1UVf-VE",
    },
  },
  {
    id: "youtube-native",
    meta: {
      accent: "#ff6b81",
      capabilities: [
        "YouTube's own control bar",
        "Native caption and quality menus",
        "English captions requested at start",
        "Package header kept outside the video",
      ],
      description:
        "Embedded YouTube with native controls for provider caption and quality menus.",
      label: "YouTube native",
      sourceUrl: `https://www.youtube.com/watch?v=${captionedVideoId}`,
      stack: "YouTube iframe, native controls",
      title: "Embedded native controls",
    },
    source: {
      captionLanguage: "en",
      controls: "native",
      id: "vite-demo-youtube-native",
      showCaptionsByDefault: true,
      title: "Embedded native controls",
      type: "youtube",
      youtubeVideoId: captionedVideoId,
    },
  },
  {
    id: "youtube-external",
    meta: {
      accent: "#ff0033",
      capabilities: [
        "No embedded playback",
        "Package-owned preview",
        "Opens YouTube to watch",
        "No playback controls",
      ],
      description:
        "A package-owned preview card that hands viewers off to YouTube.",
      label: "YouTube handoff",
      sourceUrl: `${sampleUrl}&t=2s`,
      stack: "YouTube external presentation",
      title: "External handoff",
    },
    source: {
      externalActionLabel: "Watch on YouTube",
      id: "vite-demo-youtube-external",
      posterUrl: createPosterUrl({
        accent: "#ff0033",
        base: "#111113",
        horizon: "#1b1b20",
        line: "#f1f1f1",
      }),
      presentation: "external",
      startSeconds: 2,
      title: "External handoff",
      type: "youtube",
      youtubeVideoId: "M7lc1UVf-VE",
    },
  },
];
