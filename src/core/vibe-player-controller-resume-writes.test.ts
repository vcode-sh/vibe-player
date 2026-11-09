import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { VibePlayerController } from "./vibe-player-controller";
import { fileSource, TestAdapter } from "./vibe-player-controller-test-helpers";
import type { VibePlayerResumeStore } from "./vibe-player-types";
import { playTestAdapter } from "./vibe-player-watched-test-helpers";

/** Records what the store hears: `[sourceId, seconds, reason]` or a clear. */
async function createResumePlayer(stored: number | null = null) {
  const adapter = new TestAdapter();
  const writes: (string | number | undefined)[][] = [];
  const store: VibePlayerResumeStore = {
    clear: (sourceId) => {
      writes.push(["clear", sourceId]);
    },
    get: () => stored,
    set: (sourceId, seconds, context) => {
      writes.push([sourceId, seconds, context?.reason]);
    },
  };
  const set = vi.spyOn(store, "set");
  const controller = new VibePlayerController({
    adapterFactory: () => adapter,
    resumeStore: store,
  });
  await controller.load(fileSource);
  const play = (from: number, to: number) => playTestAdapter(adapter, from, to);
  return { adapter, controller, play, set, writes };
}

describe("controller resume writes", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("saves progress only once the position moved 2 seconds, with context", async () => {
    const player = await createResumePlayer();
    player.play(0, 5.75);

    expect(player.writes).toEqual([
      ["video-1", 2, "progress"],
      ["video-1", 4, "progress"],
    ]);
    expect(player.set).toHaveBeenNthCalledWith(1, "video-1", 2, {
      duration: 100,
      reason: "progress",
    });
    await player.controller.teardown();
  });

  it("saves once after each seek settles, never while it is in flight", async () => {
    const player = await createResumePlayer();
    player.play(0, 1);
    await player.controller.seekTo(50);
    // The media echoes the controller seek.
    player.adapter.emit("seeking", { currentTime: 50 });
    player.adapter.emit("timeupdate", { currentTime: 50 });
    player.adapter.emit("seeked", { currentTime: 50 });
    // A seek the media makes itself, e.g. with native controls.
    player.adapter.emit("seeking", { currentTime: 70 });
    player.adapter.emit("timeupdate", { currentTime: 70 });
    player.adapter.emit("seeked", { currentTime: 70 });

    expect(player.writes).toEqual([
      ["video-1", 50, "seek"],
      ["video-1", 70, "seek"],
    ]);
    await player.controller.teardown();
  });

  it("saves on pause, stop and page hide, once per boundary", async () => {
    const player = await createResumePlayer();
    player.play(0, 3);
    await player.controller.pause();
    player.adapter.emit("pause", { paused: true, readyState: "ready" });
    player.controller.flushWatchedRanges("hidden");
    player.controller.flushWatchedRanges("hidden");
    player.play(3, 3.5);
    await player.controller.stop();

    expect(player.writes).toEqual([
      ["video-1", 2, "progress"],
      ["video-1", 3, "pause"],
      ["video-1", 3, "hidden"],
      ["video-1", 3.5, "pause"],
    ]);
    await player.controller.teardown();
  });

  it("saves on close, and nothing once the media ended", async () => {
    const player = await createResumePlayer();
    player.play(0, 1.5);
    await player.controller.load({ ...fileSource, id: "video-2" });
    player.play(97, 100);
    player.adapter.emit("ended", { paused: true, readyState: "ended" });
    await player.controller.teardown();

    expect(player.writes).toEqual([
      ["video-1", 1.5, "close"],
      ["video-2", 97.25, "progress"],
      ["video-2", 99.25, "progress"],
      ["clear", "video-2"],
    ]);
  });

  it("saves on close when the host loads the same source again", async () => {
    const player = await createResumePlayer();
    player.play(0, 1.5);
    await player.controller.load(fileSource);

    expect(player.writes).toEqual([["video-1", 1.5, "close"]]);
    await player.controller.teardown();
  });

  it("does not save a position the controller restores", async () => {
    const player = await createResumePlayer(30);
    player.adapter.emit("seeking", { currentTime: 30 });
    player.adapter.emit("seeked", { currentTime: 30 });
    player.play(30, 31.75);
    await player.controller.retry();
    player.play(31.75, 34);

    expect(player.adapter.calls).toContain("seek:30");
    expect(player.adapter.calls).toContain("seek:31.75");
    expect(player.writes).toEqual([["video-1", 33.75, "progress"]]);
    await player.controller.teardown();
  });

  it("lets a fatal error end a seek, so later progress saves again", async () => {
    const player = await createResumePlayer();
    player.play(0, 1);
    player.adapter.emit("seeking", {
      currentTime: 30,
      readyState: "buffering",
    });
    player.adapter.emit("error", { readyState: "error" }, { fatal: true });
    // The provider plays on, for example after recovering the media.
    player.play(40, 42.5);

    // Two seconds from the last saved spot (none yet), then two more.
    expect(player.writes).toEqual([
      ["video-1", 40.25, "progress"],
      ["video-1", 42.25, "progress"],
    ]);
    await player.controller.teardown();
  });

  it("never saves a live source", async () => {
    const player = await createResumePlayer();
    player.adapter.capabilities.isLive = true;
    player.play(0, 5);
    await player.controller.seekTo(3);
    await player.controller.pause();
    player.controller.flushWatchedRanges("hidden");
    await player.controller.closeSource();

    expect(player.set).not.toHaveBeenCalled();
  });

  it("never saves a position captured before the source turned out live", async () => {
    const player = await createResumePlayer();
    // Too little progress to save yet; the position is held for a boundary.
    player.play(0, 1);
    // The provider detects the live stream late, e.g. from its first playlist.
    player.adapter.capabilities.isLive = true;
    player.adapter.emit("durationchange", {});
    player.controller.flushWatchedRanges("hidden");
    await player.controller.closeSource();

    expect(player.set).not.toHaveBeenCalled();
  });

  it.each([
    {
      after: (controller: VibePlayerController) => {
        controller.flushWatchedRanges("hidden");
        return Promise.resolve();
      },
      next: "a page hide",
    },
    {
      after: (controller: VibePlayerController) => controller.teardown(),
      next: "teardown",
    },
    {
      after: (controller: VibePlayerController) =>
        controller.load({ ...fileSource, id: "video-2" }),
      next: "another load",
    },
  ])("never saves a stopped live source on $next", async ({ after }) => {
    const player = await createResumePlayer();
    player.adapter.capabilities.isLive = true;
    player.play(0, 5);
    // Stopping releases the adapter, so its capabilities are gone.
    await player.controller.stop();
    await after(player.controller);
    await player.controller.teardown();

    expect(player.set).not.toHaveBeenCalled();
  });
});
