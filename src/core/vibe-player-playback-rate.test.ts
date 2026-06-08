import { describe, expect, it } from "vitest";
import {
  formatVibePlayerPlaybackRate,
  getNextVibePlayerPlaybackRate,
} from "./vibe-player-playback-rate";

describe("vibe-player-playback-rate", () => {
  it("formats integer and decimal rates", () => {
    expect(formatVibePlayerPlaybackRate(1)).toBe("1x");
    expect(formatVibePlayerPlaybackRate(1.25)).toBe("1.25x");
  });

  it("cycles through supported playback rates", () => {
    expect(getNextVibePlayerPlaybackRate(1)).toBe(1.25);
    expect(getNextVibePlayerPlaybackRate(2)).toBe(0.5);
    expect(getNextVibePlayerPlaybackRate(42)).toBe(1);
  });
});
