import { describe, expect, it } from "vitest";
import { shouldRestoreVibePlayerResumePosition } from "./vibe-player-resume";

describe("shouldRestoreVibePlayerResumePosition", () => {
  it("restores valid seekable resume positions", () => {
    expect(
      shouldRestoreVibePlayerResumePosition({
        canSeek: true,
        duration: 100,
        isCurrentOperation: true,
        resumeTime: 12,
      })
    ).toBe(true);
  });

  it("skips stale, unseekable, empty, and near-ended resume positions", () => {
    expect(
      shouldRestoreVibePlayerResumePosition({
        canSeek: true,
        duration: 100,
        isCurrentOperation: false,
        resumeTime: 12,
      })
    ).toBe(false);
    expect(
      shouldRestoreVibePlayerResumePosition({
        canSeek: false,
        duration: 100,
        isCurrentOperation: true,
        resumeTime: 12,
      })
    ).toBe(false);
    expect(
      shouldRestoreVibePlayerResumePosition({
        canSeek: true,
        duration: 100,
        isCurrentOperation: true,
        resumeTime: 0,
      })
    ).toBe(false);
    expect(
      shouldRestoreVibePlayerResumePosition({
        canSeek: true,
        duration: 100,
        isCurrentOperation: true,
        resumeTime: 99,
      })
    ).toBe(false);
  });

  it("allows resume before duration metadata is useful", () => {
    expect(
      shouldRestoreVibePlayerResumePosition({
        canSeek: true,
        duration: 0,
        isCurrentOperation: true,
        resumeTime: 12,
      })
    ).toBe(true);
  });
});
