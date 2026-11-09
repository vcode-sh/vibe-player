import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fileSource } from "./vibe-player-controller-test-helpers";
import { createWatchedPlayer } from "./vibe-player-watched-test-helpers";

/** A playback id is a non-empty string. */
const playbackIdPattern = /\S/;

describe("VibePlayerController watched ranges across media release", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it.each([
    { action: "stop", reason: "pause" },
    { action: "unmount", reason: "close" },
    { action: "load", reason: "close" },
  ] as const)(
    "delivers the batch as $reason when the host calls $action",
    async ({ action, reason }) => {
      const { controller, play, reports } = await createWatchedPlayer();
      play(0, 3);
      if (action === "load") {
        await controller.load({ ...fileSource, id: "video-2" });
      } else {
        await controller[action]();
      }
      expect(reports).toEqual([
        {
          duration: 100,
          playbackId: expect.stringMatching(playbackIdPattern),
          provider: "file",
          ranges: [{ end: 3, start: 0 }],
          reason,
          sequence: 1,
          sourceId: "video-1",
        },
      ]);
      await controller.teardown();
    }
  );

  it("counts the next source's playback after a source change while seeking", async () => {
    const { adapter, controller, pause, play, reports } =
      await createWatchedPlayer();
    play(0, 2);
    adapter.emit("seeking", { currentTime: 30, readyState: "buffering" });

    await controller.load({ ...fileSource, id: "video-2" });
    play(0, 2);
    pause();

    expect(
      reports.map(({ ranges, reason, sourceId }) => ({
        ranges,
        reason,
        sourceId,
      }))
    ).toEqual([
      { ranges: [{ end: 2, start: 0 }], reason: "seek", sourceId: "video-1" },
      { ranges: [{ end: 2, start: 0 }], reason: "pause", sourceId: "video-2" },
    ]);
    await controller.teardown();
  });

  it("delivers the batch before a viewer pause resolves", async () => {
    const { controller, play, reports } = await createWatchedPlayer();
    play(0, 3);
    await controller.pause();
    expect(reports.map(({ ranges, reason }) => ({ ranges, reason }))).toEqual([
      { ranges: [{ end: 3, start: 0 }], reason: "pause" },
    ]);
    await controller.teardown();
  });

  it.each([
    { renewSource: undefined, way: "a retry" },
    {
      renewSource: () =>
        Promise.resolve({ ...fileSource, expiresAt: Date.now() + 600_000 }),
      way: "a renewal",
    },
  ])(
    "delivers the batch as reload when $way reattaches the source",
    async ({ renewSource }) => {
      const { controller, pause, play, reports } = await createWatchedPlayer({
        renewSource,
      });
      play(0, 3);
      await controller.retry();
      expect(reports.map(({ ranges, reason }) => ({ ranges, reason }))).toEqual(
        [{ ranges: [{ end: 3, start: 0 }], reason: "reload" }]
      );
      play(3, 5);
      pause();
      expect(reports[1]).toMatchObject({
        ranges: [{ end: 5, start: 3 }],
        reason: "pause",
      });
      await controller.teardown();
    }
  );
});
