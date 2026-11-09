import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createWatchedPlayer } from "./vibe-player-watched-test-helpers";

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
    expect(reports.map((report) => report.reason)).toEqual(["ended"]);
    expect(reports[0]?.ranges).toEqual([
      { end: 5, start: 0 },
      { end: 52, start: 50 },
      { end: 83, start: 82 },
    ]);
  });

  it("merges a replayed stretch into the range it overlaps", async () => {
    const { controller, pause, play, reports } = await createWatchedPlayer();
    play(0, 10);
    await controller.seekTo(5);
    play(5, 15);
    pause();
    expect(reports[0]?.ranges).toEqual([{ end: 15, start: 0 }]);
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
      { ranges: [{ end: 2, start: 0 }], reason: "flush" },
      { ranges: [{ end: 40, start: 30 }], reason: "pause" },
    ]);
  });

  it.each(["pause", "ended", "retry"] as const)(
    "a seek the provider never finishes stops blocking watched time after %s",
    async (finish) => {
      const { adapter, controller, pause, play, reports } =
        await createWatchedPlayer();
      play(0, 2);
      adapter.emit("seeking", { currentTime: 30, readyState: "buffering" });
      if (finish === "retry") {
        await controller.retry();
      } else {
        adapter.emit(finish, {
          paused: true,
          readyState: finish === "ended" ? "ended" : "ready",
        });
      }
      play(40, 42);
      pause();
      expect(reports.at(-1)?.ranges).toEqual([{ end: 42, start: 40 }]);
    }
  );

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
