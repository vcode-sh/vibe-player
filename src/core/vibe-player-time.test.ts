import { describe, expect, it } from "vitest";
import {
  clampVibePlayerTime,
  formatVibePlayerTime,
  getFiniteVibePlayerDuration,
} from "./vibe-player-time";

describe("vibe-player-time", () => {
  it.each([
    [Number.NaN, "00:00"],
    [Number.POSITIVE_INFINITY, "00:00"],
    [-1, "00:00"],
    [0, "00:00"],
    [59.999, "00:59"],
    [60, "01:00"],
    [3661.9, "61:01"],
  ])("formats %s without rounding across the next second", (seconds, text) => {
    expect(formatVibePlayerTime(seconds)).toBe(text);
  });

  it("uses metadata only when positive and finite, otherwise the supplied fallback", () => {
    expect(getFiniteVibePlayerDuration({ duration: 12.5 }, 42)).toBe(12.5);
    for (const duration of [Number.NaN, Number.POSITIVE_INFINITY, 0, -1]) {
      expect(getFiniteVibePlayerDuration({ duration }, 42)).toBe(42);
      expect(getFiniteVibePlayerDuration({ duration }, null)).toBe(0);
    }
  });

  it("bounds finite seeks but preserves them while duration is unknown", () => {
    expect(clampVibePlayerTime(9.5, 10, false)).toBe(9.5);
    expect(clampVibePlayerTime(10, 10, false)).toBe(10);
    expect(clampVibePlayerTime(12, 10, false)).toBe(10);
    expect(clampVibePlayerTime(12, 0, false)).toBe(12);
    expect(clampVibePlayerTime(12, Number.NaN, false)).toBe(12);
    expect(clampVibePlayerTime(-1, 10, false)).toBe(0);
    expect(clampVibePlayerTime(Number.POSITIVE_INFINITY, 10, false)).toBe(0);
    expect(clampVibePlayerTime(12, 10, true)).toBe(0);
  });
});
