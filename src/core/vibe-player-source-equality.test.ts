import { describe, expect, it } from "vitest";
import { haveEqualVibePlayerSources } from "./vibe-player-source-equality";
import type { VibePlayerYouTubeSource } from "./vibe-player-types";

const source: VibePlayerYouTubeSource = {
  captionLanguage: "en",
  controls: "custom",
  id: "lesson",
  showCaptionsByDefault: true,
  type: "youtube",
  youtubeVideoId: "M7lc1UVf-VE",
};

// Each option changes SDK construction, so a same-ID edit must start a new session.
describe("YouTube source equality", () => {
  it("keeps an equal fresh source object in the same session", () => {
    expect(haveEqualVibePlayerSources(source, { ...source })).toBe(true);
  });

  it.each([
    { change: { controls: "native" as const }, option: "controls" },
    { change: { captionLanguage: "de" }, option: "captionLanguage" },
    {
      change: { showCaptionsByDefault: false },
      option: "showCaptionsByDefault",
    },
  ])("observes a same-ID $option change", ({ change }) => {
    expect(haveEqualVibePlayerSources(source, { ...source, ...change })).toBe(
      false
    );
  });
});
