import { describe, expect, it } from "vitest";
import { VibePlayerWatchedCoverage } from "./vibe-player-watched-coverage";

describe("VibePlayerWatchedCoverage", () => {
  it("counts replayed media once and forgets it on reset", () => {
    const coverage = new VibePlayerWatchedCoverage();
    coverage.add(0, 2);
    coverage.add(1, 3);
    coverage.add(0, 1);
    coverage.add(5, 6);
    expect(coverage.seconds).toBe(4);
    coverage.reset();
    expect(coverage.seconds).toBe(0);
  });

  it("bounds memory by merging the two closest spans", () => {
    const coverage = new VibePlayerWatchedCoverage();
    // 256 one-second spans, 9 seconds apart: the limit, nothing merged.
    for (let index = 0; index < 256; index += 1) {
      coverage.add(index * 10, index * 10 + 1);
    }
    expect(coverage.seconds).toBe(256);
    // A 257th span 4 seconds before its right neighbor and 4.5 after its
    // left one: only the 4-second gap becomes watched.
    coverage.add(5.5, 6);
    expect(coverage.seconds).toBe(260.5);
  });
});
