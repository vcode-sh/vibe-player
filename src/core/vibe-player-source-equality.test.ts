import { describe, expect, it } from "vitest";
import { haveEqualVibePlayerSources } from "./vibe-player-source-equality";
import type {
  VibePlayerFileSource,
  VibePlayerHlsSource,
} from "./vibe-player-types";

const file: VibePlayerFileSource = {
  captions: [
    {
      id: "en",
      kind: "captions",
      label: "English",
      language: "en",
      url: "/captions.vtt",
    },
  ],
  id: "lesson",
  sources: [{ mimeType: "video/mp4", url: "/lesson.mp4" }],
  type: "file",
};
const hls: VibePlayerHlsSource = {
  id: "lesson",
  manifestUrl: "/lesson.m3u8",
  type: "hls",
};

describe("file and HLS source equality", () => {
  it("preserves equivalent delivery and caption values across fresh objects", () => {
    expect(
      haveEqualVibePlayerSources(file, {
        ...file,
        captions: file.captions?.map((track) => ({ ...track })) ?? [],
        sources: file.sources.map((media) => ({ ...media })),
      })
    ).toBe(true);
    expect(haveEqualVibePlayerSources(hls, { ...hls, captions: [] })).toBe(
      true
    );
    expect(haveEqualVibePlayerSources(null, null)).toBe(true);
  });

  it.each([
    { sources: [{ mimeType: "video/mp4", url: "/replacement.mp4" }] },
    { sources: [{ mimeType: "video/webm", url: "/lesson.mp4" }] },
    { captions: [] },
    {
      captions: [
        {
          id: "en",
          kind: "captions" as const,
          label: "English",
          language: "en",
          url: "/revised.vtt",
        },
      ],
    },
  ])("observes same-ID media and caption changes: %j", (change) => {
    expect(haveEqualVibePlayerSources(file, { ...file, ...change })).toBe(
      false
    );
  });

  it.each([
    { manifestUrl: "/replacement.m3u8" },
    { live: true },
    { crossOrigin: "use-credentials" as const },
    { url: "/refreshed.m3u8" },
    { expiresAt: 170_000 },
    { height: 1280, width: 720 },
    { durationSeconds: 83 },
  ])("observes same-ID HLS delivery changes: %j", (change) => {
    expect(haveEqualVibePlayerSources(hls, { ...hls, ...change })).toBe(false);
  });

  it("distinguishes removed, replaced and differently identified sources", () => {
    expect(haveEqualVibePlayerSources(file, null)).toBe(false);
    expect(haveEqualVibePlayerSources(null, file)).toBe(false);
    expect(haveEqualVibePlayerSources(file, hls)).toBe(false);
    expect(haveEqualVibePlayerSources(file, { ...file, id: "other" })).toBe(
      false
    );
  });
});
