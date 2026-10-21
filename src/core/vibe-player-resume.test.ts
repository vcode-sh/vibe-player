import { describe, expect, it } from "vitest";
import { shouldRestoreVibePlayerResumePosition } from "./vibe-player-resume";

const eligible = {
  canSeek: true,
  duration: 100,
  isCurrentOperation: true,
  resumeTime: 12,
};

describe("shouldRestoreVibePlayerResumePosition", () => {
  it("requires a current seekable source and a positive saved position", () => {
    expect(shouldRestoreVibePlayerResumePosition(eligible)).toBe(true);
    expect(
      shouldRestoreVibePlayerResumePosition({ ...eligible, canSeek: false })
    ).toBe(false);
    expect(
      shouldRestoreVibePlayerResumePosition({
        ...eligible,
        isCurrentOperation: false,
      })
    ).toBe(false);
    for (const resumeTime of [null, undefined, 0, -1, Number.NaN]) {
      expect(
        shouldRestoreVibePlayerResumePosition({ ...eligible, resumeTime })
      ).toBe(false);
    }
  });

  it("does not resume within the final second of a finite video", () => {
    for (const [resumeTime, expected] of [
      [98.999, true],
      [99, false],
      [99.001, false],
      [100, false],
    ] as const) {
      expect(
        shouldRestoreVibePlayerResumePosition({ ...eligible, resumeTime })
      ).toBe(expected);
    }
  });

  it("allows a positive position before useful duration metadata arrives", () => {
    for (const duration of [0, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(
        shouldRestoreVibePlayerResumePosition({ ...eligible, duration })
      ).toBe(true);
    }
  });
});
