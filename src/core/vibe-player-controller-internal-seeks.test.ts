import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { VibePlayerAnalyticsEvent } from "./vibe-player-types";
import { createWatchedPlayer } from "./vibe-player-watched-test-helpers";

/** A watched-ranges player that also records seeks and resume saves. */
async function createInternalSeekPlayer() {
  const analytics: VibePlayerAnalyticsEvent[] = [];
  const saves: (string | undefined)[] = [];
  const player = await createWatchedPlayer({
    onAnalyticsEvent: (event) => {
      analytics.push(event);
    },
    resumeStore: {
      clear: () => undefined,
      get: () => null,
      set: (_sourceId, _seconds, context) => {
        saves.push(context?.reason);
      },
    },
  });
  const seeks = () => analytics.filter((event) => event.type === "seek");
  return { ...player, saves, seeks };
}

describe("controller seeks the provider makes itself", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("neither reports nor saves a stall nudge, and never credits its jump", async () => {
    const player = await createInternalSeekPlayer();
    player.play(0, 10);
    // The provider jumps first and announces it on a diagnostic event.
    player.adapter.emit(
      "error",
      { currentTime: 10.5 },
      { fatal: false, internal: true, message: "Nudged over a stall" }
    );
    player.adapter.emit(
      "seeking",
      { currentTime: 10.5, readyState: "buffering" },
      { internal: true }
    );
    player.adapter.emit(
      "seeked",
      { currentTime: 10.5, readyState: "playing" },
      { internal: true }
    );
    player.play(10.5, 12);
    player.pause();

    expect(player.seeks()).toEqual([]);
    expect(player.saves).not.toContain("seek");
    expect(
      player.reports.map(({ ranges, reason }) => ({ ranges, reason }))
    ).toEqual([
      {
        ranges: [
          { end: 10, start: 0 },
          { end: 12, start: 10.5 },
        ],
        reason: "pause",
      },
    ]);
    await player.controller.teardown();
  });

  it("keeps one batch across a live-edge catch-up", async () => {
    const player = await createInternalSeekPlayer();
    player.play(0, 3);
    player.adapter.emit(
      "seeking",
      { currentTime: 40, readyState: "buffering" },
      { internal: true }
    );
    player.adapter.emit(
      "seeked",
      { currentTime: 40, readyState: "playing" },
      { internal: true }
    );
    player.play(40, 42);
    player.pause();

    expect(player.seeks()).toEqual([]);
    expect(player.saves).not.toContain("seek");
    expect(player.reports.map(({ reason }) => reason)).toEqual(["pause"]);
    expect(player.reports[0]?.ranges).toEqual([
      { end: 3, start: 0 },
      { end: 42, start: 40 },
    ]);
    await player.controller.teardown();
  });
});
