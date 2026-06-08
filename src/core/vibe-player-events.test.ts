import { describe, expect, it } from "vitest";
import { getVibePlayerProgressMilestone } from "./vibe-player-events";

describe("getVibePlayerProgressMilestone", () => {
  it("returns null below the first milestone", () => {
    expect(getVibePlayerProgressMilestone(24, new Set())).toBeNull();
  });

  it("returns the first matching unsent milestone", () => {
    expect(
      getVibePlayerProgressMilestone(76, new Set(["progress_25"]))
    ).toEqual({
      event: "progress_50",
      progressPct: 50,
    });
  });
});
