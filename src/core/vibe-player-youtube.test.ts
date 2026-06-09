import { describe, expect, it } from "vitest";
import {
  createVibePlayerYouTubeWatchUrl,
  getVibePlayerYouTubePresentation,
} from "./vibe-player-youtube";

describe("vibe player YouTube helpers", () => {
  it("defaults YouTube sources to official iframe presentation", () => {
    expect(
      getVibePlayerYouTubePresentation({
        id: "youtube",
        type: "youtube",
        youtubeVideoId: "M7lc1UVf-VE",
      })
    ).toBe("iframe");
  });

  it("creates watch URLs with optional start seconds", () => {
    expect(
      createVibePlayerYouTubeWatchUrl({
        startSeconds: 12.8,
        youtubeVideoId: "M7lc1UVf-VE",
      })
    ).toBe("https://www.youtube.com/watch?v=M7lc1UVf-VE&t=12s");
  });
});
