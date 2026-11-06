import { describe, expect, it } from "vitest";
import type { VibePlayerSnapshot } from "../core/vibe-player-runtime-types";
import { createIdleSnapshot } from "../core/vibe-player-time";
import {
  getVibePlayerSurfaceBusyDelay,
  getVibePlayerSurfacePhase,
} from "./vibe-player-surface-phase";

function snapshot(next: Partial<VibePlayerSnapshot>): VibePlayerSnapshot {
  return { ...createIdleSnapshot(), ...next };
}

describe("compact surface phase", () => {
  it("treats a stall during playback as playing, but a first load as loading", () => {
    const waiting = snapshot({ paused: false, readyState: "buffering" });
    expect(getVibePlayerSurfacePhase(waiting, false, "playing")).toBe(
      "playing"
    );
    expect(getVibePlayerSurfacePhase(waiting, false, "idle")).toBe("loading");
  });

  it("reports renewal only when it interrupts playback", () => {
    const suspended = snapshot({ paused: false, readyState: "loading" });
    expect(getVibePlayerSurfacePhase(suspended, true, "playing")).toBe(
      "renewing"
    );
    // A retry after an error is a fresh load for the viewer.
    expect(getVibePlayerSurfacePhase(suspended, true, "error")).toBe("loading");
  });

  it("keeps an eagerly loaded, never played source idle", () => {
    const ready = snapshot({ paused: true, readyState: "ready" });
    expect(getVibePlayerSurfacePhase(ready, false, "idle")).toBe("idle");
    expect(
      getVibePlayerSurfacePhase({ ...ready, currentTime: 3 }, false, "idle")
    ).toBe("paused");
    expect(getVibePlayerSurfacePhase(ready, false, "playing")).toBe("paused");
  });

  it("delays loading feedback 320 ms and renewal feedback 600 ms", () => {
    expect(getVibePlayerSurfaceBusyDelay("loading", "loading")).toBe(320);
    expect(getVibePlayerSurfaceBusyDelay("playing", "buffering")).toBe(320);
    expect(getVibePlayerSurfaceBusyDelay("renewing", "loading")).toBe(600);
    expect(getVibePlayerSurfaceBusyDelay("playing", "playing")).toBeNull();
    expect(getVibePlayerSurfaceBusyDelay("paused", "buffering")).toBeNull();
  });
});
