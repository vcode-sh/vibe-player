import { describe, expect, it } from "vitest";
import { getVibePlayerProgressMilestone } from "./vibe-player-events";

describe("getVibePlayerProgressMilestone", () => {
  it("emits the earliest unsent milestone at its inclusive threshold", () => {
    const sent = new Set<string>();
    expect(getVibePlayerProgressMilestone(24.99, sent)).toBeNull();
    expect(getVibePlayerProgressMilestone(25, sent)).toEqual({
      event: "progress_25",
      progressPct: 25,
    });
    sent.add("progress_25");
    expect(getVibePlayerProgressMilestone(49.99, sent)).toBeNull();
    expect(getVibePlayerProgressMilestone(50, sent)).toEqual({
      event: "progress_50",
      progressPct: 50,
    });
    sent.add("progress_50");
    expect(getVibePlayerProgressMilestone(74.99, sent)).toBeNull();
    expect(getVibePlayerProgressMilestone(75, sent)).toEqual({
      event: "progress_75",
      progressPct: 75,
    });
    sent.add("progress_75");
    expect(getVibePlayerProgressMilestone(100, sent)).toBeNull();
  });

  it("does not skip an unsent milestone after a large playback jump", () => {
    expect(
      getVibePlayerProgressMilestone(76, new Set(["progress_25"]))
    ).toEqual({
      event: "progress_50",
      progressPct: 50,
    });
  });
});
