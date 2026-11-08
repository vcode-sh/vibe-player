import {
  createVibePlayerSeekThumbnails,
  type VibePlayerCaptionTrack,
  type VibePlayerHlsSource,
} from "vibe-player";

// Every showcase player plays the local fMP4 ladders that
// `bun run test:browser:host:media` generates into `/adoption-media`
// (`../adoption-sources.ts` describes the portrait and landscape clips).

/** One audible player at a time across the whole page. */
export const showcaseAudioFocus = "showcase";

/** A copy of a source under a new ID, so each player keeps its own session. */
export function withId(
  source: VibePlayerHlsSource,
  id: string
): VibePlayerHlsSource {
  return { ...source, id };
}

/** The 60 s single-lane clip; long enough for ranges, progress and resume. */
export const longSource: VibePlayerHlsSource = {
  durationSeconds: 60,
  height: 720,
  id: "showcase-long",
  posterUrl: "/adoption-media/landscape/poster.jpg",
  title: "One minute of test pattern",
  type: "hls",
  url: "/adoption-media/long/lane0.m3u8",
  width: 1280,
};

export const showcaseCaptions: VibePlayerCaptionTrack = {
  default: true,
  id: "showcase-captions",
  kind: "captions",
  label: "English",
  language: "en",
  url: "/captions/showcase.vtt",
};

/** The generated storyboard: one 160 x 90 tile per second, four per row. */
export const landscapeThumbnails = createVibePlayerSeekThumbnails({
  columns: 4,
  count: 8,
  duration: 8,
  height: 90,
  interval: 1,
  url: "/adoption-media/landscape/storyboard.jpg",
  width: 160,
});

/** The same storyboard described as a WebVTT thumbnail track. */
export const landscapeThumbnailTrack = "/seek/landscape-storyboard.vtt";

function bump(x: number, centre: number, width: number, height: number) {
  return height * Math.exp(-((x - centre) ** 2) / (2 * width * width));
}

/**
 * Illustrative share of viewers for 100 equal slices: a high opening and a
 * rewatched moment near 40 %. A real host aggregates `onWatchedRanges`.
 */
export const replayIntensity: readonly number[] = Array.from(
  { length: 100 },
  (_, index) => {
    const x = index / 99;
    return (
      0.18 +
      0.4 * Math.exp(-x * 3) +
      bump(x, 0.4, 0.04, 0.62) +
      bump(x, 0.75, 0.06, 0.3)
    );
  }
);

export const replayLabels = {
  replayValue: (share: number) => `${Math.round(share * 100)}% of viewers`,
};

/** Peaks named by the host instead of detected (duration fractions). */
export const namedPeaks: readonly number[] = [0.4, 0.75];
