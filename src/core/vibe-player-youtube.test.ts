import { describe, expect, it } from "vitest";
import {
  createVibePlayerYouTubeWatchUrl,
  getVibePlayerYouTubePresentation,
} from "./vibe-player-youtube";

const source = {
  id: "youtube",
  type: "youtube",
  youtubeVideoId: "M7lc1UVf-VE",
} as const;

describe("vibe player YouTube helpers", () => {
  it("defaults to iframe without overriding an explicit external handoff", () => {
    expect(getVibePlayerYouTubePresentation(source)).toBe("iframe");
    expect(
      getVibePlayerYouTubePresentation({ ...source, presentation: "external" })
    ).toBe("external");
  });

  it("floors positive start seconds and omits unusable offsets", () => {
    expect(
      createVibePlayerYouTubeWatchUrl({ ...source, startSeconds: 12.8 })
    ).toBe("https://www.youtube.com/watch?v=M7lc1UVf-VE&t=12s");
    for (const startSeconds of [
      0,
      -3,
      0.9,
      Number.NaN,
      Number.POSITIVE_INFINITY,
    ]) {
      expect(createVibePlayerYouTubeWatchUrl({ ...source, startSeconds })).toBe(
        "https://www.youtube.com/watch?v=M7lc1UVf-VE"
      );
    }
    expect(createVibePlayerYouTubeWatchUrl(source)).toBe(
      "https://www.youtube.com/watch?v=M7lc1UVf-VE"
    );
  });
});
