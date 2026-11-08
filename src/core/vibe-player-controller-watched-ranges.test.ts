import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { VibePlayerController } from "./vibe-player-controller";
import { fileSource, TestAdapter } from "./vibe-player-controller-test-helpers";
import type { VibePlayerWatchedRangesReport } from "./vibe-player-watched-ranges";

async function createWatchedPlayer() {
  const adapter = new TestAdapter();
  const reports: VibePlayerWatchedRangesReport[] = [];
  const controller = new VibePlayerController({
    adapterFactory: () => adapter,
    onWatchedRanges: (report) => {
      reports.push(report);
    },
  });
  await controller.load(fileSource);
  /** Plays like a browser: a timeupdate every 250 ms of wall-clock time. */
  const play = (from: number, to: number) => {
    adapter.emit("playing", {
      currentTime: from,
      paused: false,
      readyState: "playing",
    });
    for (let time = from + 0.25; time <= to + 1e-9; time += 0.25) {
      vi.advanceTimersByTime(250);
      adapter.emit("timeupdate", { currentTime: time });
    }
  };
  const pause = () =>
    adapter.emit("pause", { paused: true, readyState: "ready" });
  return { adapter, controller, pause, play, reports };
}

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
