import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createWatchedPlayer,
  type WatchedPlayer,
} from "./vibe-player-watched-test-helpers";

describe("VibePlayerController watched ranges", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("reports one range for continuous playback when the viewer pauses", async () => {
    const { pause, play, reports } = await createWatchedPlayer();
    play(10, 20);
    pause();
    expect(reports).toEqual([
      {
        duration: 100,
        provider: "file",
        ranges: [{ end: 20, start: 10 }],
        reason: "pause",
        sourceId: "video-1",
      },
    ]);
    pause();
    expect(reports).toHaveLength(1);
  });

  it("never counts the time skipped by a seek, a scrub or an outside jump", async () => {
    const { adapter, controller, play, reports } = await createWatchedPlayer();
    play(0, 5);
    await controller.seekTo(50);
    play(50, 52);
    // A provider-native seek: time leaps 30 s in one 250 ms tick.
    vi.advanceTimersByTime(250);
    adapter.emit("timeupdate", { currentTime: 82 });
    play(82, 83);
    adapter.emit("ended", {
      currentTime: 83,
      paused: true,
      readyState: "ended",
    });
    expect(reports.map(({ ranges, reason }) => ({ ranges, reason }))).toEqual([
      { ranges: [{ end: 5, start: 0 }], reason: "seek" },
      {
        ranges: [
          { end: 52, start: 50 },
          { end: 83, start: 82 },
        ],
        reason: "ended",
      },
    ]);
  });

  it("delivers the batch at a controller seek, so a replayed stretch stays separate", async () => {
    const { controller, pause, play, reports } = await createWatchedPlayer();
    play(0, 10);
    // This provider reports no seeking/seeked for the seek.
    await controller.seekTo(5);
    play(5, 15);
    pause();
    expect(reports.map(({ ranges, reason }) => ({ ranges, reason }))).toEqual([
      { ranges: [{ end: 10, start: 0 }], reason: "seek" },
      { ranges: [{ end: 15, start: 5 }], reason: "pause" },
    ]);
  });

  it("sends nothing twice when the media echoes a controller seek", async () => {
    const { adapter, controller, pause, play, reports } =
      await createWatchedPlayer();
    play(0, 3);
    await controller.seekTo(40);
    adapter.emit("seeking", { currentTime: 40, readyState: "buffering" });
    adapter.emit("seeked", { currentTime: 40, readyState: "playing" });
    pause();
    await controller.seekTo(60);
    expect(reports.map(({ ranges, reason }) => ({ ranges, reason }))).toEqual([
      { ranges: [{ end: 3, start: 0 }], reason: "seek" },
    ]);
  });

  it("does not count media time while playback stalls", async () => {
    const { adapter, pause, play, reports } = await createWatchedPlayer();
    play(0, 2);
    adapter.emit("buffering", { readyState: "buffering" });
    vi.advanceTimersByTime(4000);
    // The stall resolves after a host-invisible skip ahead.
    play(9, 10);
    pause();
    expect(reports[0]?.ranges).toEqual([
      { end: 2, start: 0 },
      { end: 10, start: 9 },
    ]);
  });

  it("delivers pending ranges on a manual flush and when the source closes", async () => {
    const { controller, play, reports } = await createWatchedPlayer();
    play(0, 3);
    controller.flushWatchedRanges("hidden");
    play(3, 4);
    await controller.closeSource();
    expect(reports.map(({ ranges, reason }) => ({ ranges, reason }))).toEqual([
      { ranges: [{ end: 3, start: 0 }], reason: "hidden" },
      { ranges: [{ end: 4, start: 3 }], reason: "close" },
    ]);
  });

  it("reports nothing when playback never progressed", async () => {
    const { controller, pause, reports } = await createWatchedPlayer();
    pause();
    controller.flushWatchedRanges();
    await controller.teardown();
    expect(reports).toEqual([]);
  });

  it("keeps counting after a seek that finishes while a pause is pending", async () => {
    const { adapter, controller, pause, play, reports } =
      await createWatchedPlayer();
    adapter.pauseLeavesSnapshotStale = true;
    play(0, 2);
    adapter.emit("seeking", { currentTime: 30, readyState: "buffering" });
    // The provider finishes the seek before it acknowledges the pause.
    await controller.pause();
    adapter.emit("seeked", { currentTime: 30, readyState: "playing" });
    pause();
    await controller.play();
    play(30, 40);
    pause();
    expect(reports.map(({ ranges, reason }) => ({ ranges, reason }))).toEqual([
      { ranges: [{ end: 2, start: 0 }], reason: "seek" },
      { ranges: [{ end: 40, start: 30 }], reason: "pause" },
    ]);
  });

  it.each<[string, (player: WatchedPlayer) => unknown]>([
    [
      "a pause event",
      ({ adapter }) =>
        adapter.emit("pause", { paused: true, readyState: "ready" }),
    ],
    [
      "an acknowledged pause",
      async ({ controller }) => {
        await controller.pause();
        await controller.play();
      },
    ],
    [
      "the end",
      ({ adapter }) =>
        adapter.emit("ended", { paused: true, readyState: "ended" }),
    ],
    [
      "a fatal error",
      ({ adapter }) =>
        adapter.emit("error", { readyState: "error" }, { fatal: true }),
    ],
    ["a retry", ({ controller }) => controller.retry()],
  ])(
    "a seek the provider never finishes stops blocking watched time after %s",
    async (_, finish) => {
      const player = await createWatchedPlayer();
      player.play(0, 2);
      player.adapter.emit("seeking", {
        currentTime: 30,
        readyState: "buffering",
      });
      await finish(player);
      player.play(40, 42);
      player.pause();
      expect(player.reports.at(-1)?.ranges).toEqual([{ end: 42, start: 40 }]);
    }
  );

  it("keeps a seek open through a nonfatal provider error", async () => {
    const { adapter, pause, play, reports } = await createWatchedPlayer();
    play(0, 2);
    adapter.emit("seeking", { currentTime: 30, readyState: "buffering" });
    adapter.emit("error", {}, { fatal: false, message: "Fragment retry" });
    // Progress reported before `seeked` belongs to the unfinished seek.
    for (const currentTime of [10.25, 10.5, 10.75]) {
      vi.advanceTimersByTime(250);
      adapter.emit("timeupdate", { currentTime, readyState: "playing" });
    }
    adapter.emit("seeked", { currentTime: 30, readyState: "playing" });
    play(30, 32);
    pause();
    expect(reports.map(({ ranges, reason }) => ({ ranges, reason }))).toEqual([
      { ranges: [{ end: 2, start: 0 }], reason: "seek" },
      { ranges: [{ end: 32, start: 30 }], reason: "pause" },
    ]);
  });

  it("bounds a batch by flushing early at 64 separate ranges", async () => {
    const { controller, play, reports } = await createWatchedPlayer();
    // Each `playing` jumps 9 s ahead of the previous range.
    for (let index = 0; index < 65; index += 1) {
      play(index * 10, index * 10 + 1);
    }
    expect(reports).toHaveLength(1);
    expect(reports[0]?.reason).toBe("limit");
    expect(reports[0]?.ranges).toHaveLength(64);
    controller.flushWatchedRanges();
    expect(reports[1]?.ranges).toEqual([{ end: 641, start: 640 }]);
  });
});
