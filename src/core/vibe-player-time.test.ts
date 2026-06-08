import { describe, expect, it } from "vitest";
import {
  clampVibePlayerTime,
  createIdleSnapshot,
  formatVibePlayerTime,
  getFiniteVibePlayerDuration,
} from "./vibe-player-time";

describe("vibe-player-time", () => {
  it("formats invalid time as zero", () => {
    expect(formatVibePlayerTime(0)).toBe("00:00");
    expect(formatVibePlayerTime(Number.NaN)).toBe("00:00");
  });

  it("returns finite duration with fallback", () => {
    expect(getFiniteVibePlayerDuration({ duration: Number.NaN }, 42)).toBe(42);
    expect(getFiniteVibePlayerDuration({ duration: 12.5 }, null)).toBe(12.5);
  });

  it("clamps finite seek time", () => {
    expect(clampVibePlayerTime(12, 10, false)).toBe(10);
    expect(clampVibePlayerTime(-1, 10, false)).toBe(0);
    expect(clampVibePlayerTime(12, 10, true)).toBe(0);
  });

  it("creates an idle snapshot", () => {
    expect(createIdleSnapshot().readyState).toBe("idle");
  });
});
