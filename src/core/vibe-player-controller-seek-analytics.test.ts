import { describe, expect, it } from "vitest";
import { VibePlayerController } from "./vibe-player-controller";
import { fileSource, TestAdapter } from "./vibe-player-controller-test-helpers";
import type { VibePlayerAnalyticsEvent } from "./vibe-player-types";

async function createSeekPlayer(resumeAt: number | null = null) {
  const adapter = new TestAdapter();
  const analytics: VibePlayerAnalyticsEvent[] = [];
  const controller = new VibePlayerController({
    adapterFactory: () => adapter,
    onAnalyticsEvent: (event) => {
      analytics.push(event);
    },
    resumeStore: {
      clear: () => undefined,
      get: () => resumeAt,
      set: () => undefined,
    },
  });
  await controller.load(fileSource);
  const playAt = (currentTime: number) =>
    adapter.emit("playing", {
      currentTime,
      paused: false,
      readyState: "playing",
    });
  const end = () =>
    adapter.emit("ended", {
      currentTime: 100,
      paused: true,
      readyState: "ended",
    });
  const seeks = () => analytics.filter((event) => event.type === "seek");
  return { adapter, controller, end, playAt, seeks };
}

type SeekPlayer = Awaited<ReturnType<typeof createSeekPlayer>>;

describe("controller seek analytics", () => {
  it("reports a seek the media starts with where it left and where it went", async () => {
    const { adapter, controller, playAt, seeks } = await createSeekPlayer();
    playAt(12);
    adapter.emit("seeking", { currentTime: 40, readyState: "buffering" });
    adapter.emit("seeked", { currentTime: 40, readyState: "playing" });
    expect(seeks()).toEqual([
      {
        currentTime: 40,
        duration: 100,
        from: 12,
        initiator: "media",
        provider: "file",
        sourceId: "video-1",
        type: "seek",
      },
    ]);
    await controller.teardown();
  });

  it("reports a controller seek once even when the media echoes it", async () => {
    const { adapter, controller, playAt, seeks } = await createSeekPlayer();
    playAt(12);
    await controller.seekTo(37);
    adapter.emit("seeking", { currentTime: 37, readyState: "buffering" });
    adapter.emit("seeked", { currentTime: 37, readyState: "playing" });
    expect(seeks()).toEqual([
      {
        currentTime: 37,
        duration: 100,
        from: 12,
        initiator: "controller",
        provider: "file",
        sourceId: "video-1",
        type: "seek",
      },
    ]);
    await controller.teardown();
  });

  it("reports a later media seek to the same spot after an unechoed controller seek", async () => {
    const { adapter, controller, playAt, seeks } = await createSeekPlayer();
    // This provider reports no seeking/seeked for its own seeks.
    await controller.seekTo(37);
    playAt(37);
    adapter.emit("timeupdate", { currentTime: 45 });
    adapter.emit("seeking", { currentTime: 37, readyState: "buffering" });
    expect(
      seeks().map(({ currentTime, from, initiator }) => ({
        currentTime,
        from,
        initiator,
      }))
    ).toEqual([
      { currentTime: 37, from: 0, initiator: "controller" },
      { currentTime: 37, from: 45, initiator: "media" },
    ]);
    await controller.teardown();
  });

  it("reports a media seek near a controller seek that already settled", async () => {
    const { adapter, controller, seeks } = await createSeekPlayer();
    await controller.seekTo(30);
    adapter.emit("seeking", { currentTime: 30, readyState: "buffering" });
    adapter.emit("seeked", { currentTime: 30, readyState: "ready" });
    // Paused media reports nothing until the viewer nudges it natively.
    adapter.emit("seeking", { currentTime: 30.2, readyState: "buffering" });
    expect(seeks().map(({ initiator }) => initiator)).toEqual([
      "controller",
      "media",
    ]);
    await controller.teardown();
  });

  it.each(["seeked", "timeupdate"] as const)(
    "keeps a newer controller seek when a late %s reports the previous one",
    async (late) => {
      const { adapter, controller, playAt, seeks } = await createSeekPlayer();
      playAt(12);
      await controller.seekTo(20);
      adapter.emit("seeking", { currentTime: 20, readyState: "buffering" });
      await controller.seekTo(60);
      // Queued before the second seek, so it still reports 20 s.
      adapter.emit(late, { currentTime: 20, readyState: "playing" });
      adapter.emit("seeking", { currentTime: 60, readyState: "buffering" });
      adapter.emit("seeked", { currentTime: 60, readyState: "playing" });
      expect(
        seeks().map(({ currentTime, initiator }) => ({
          currentTime,
          initiator,
        }))
      ).toEqual([
        { currentTime: 20, initiator: "controller" },
        { currentTime: 60, initiator: "controller" },
      ]);
      await controller.teardown();
    }
  );

  it.each<[string, (player: SeekPlayer) => Promise<unknown> | undefined]>([
    [
      "a retry",
      async ({ adapter, controller, playAt }) => {
        playAt(12);
        await controller.retry();
        adapter.emit("seeking", { currentTime: 12, readyState: "buffering" });
        adapter.emit("seeked", { currentTime: 12, readyState: "ready" });
      },
    ],
    [
      "a replay through the controller",
      async ({ adapter, controller, end }) => {
        end();
        await controller.play();
        adapter.emit("seeking", { currentTime: 0, readyState: "buffering" });
        adapter.emit("seeked", { currentTime: 0, readyState: "ready" });
      },
    ],
    [
      "a replay the media rewinds before it plays",
      ({ adapter, end }) => {
        end();
        adapter.emit("seeking", {
          currentTime: 0,
          paused: false,
          readyState: "buffering",
        });
        adapter.emit("play", { paused: false });
        adapter.emit("seeked", { currentTime: 0, readyState: "playing" });
      },
    ],
    [
      "a replay the media plays before it rewinds",
      ({ adapter, end }) => {
        end();
        adapter.emit("play", { paused: false, readyState: "buffering" });
        adapter.emit("seeking", { currentTime: 0, readyState: "buffering" });
        adapter.emit("seeked", { currentTime: 0, readyState: "playing" });
      },
    ],
  ])("never reports the position restored for %s", async (_, act) => {
    const player = await createSeekPlayer();
    await act(player);
    expect(player.seeks()).toEqual([]);
    await player.controller.teardown();
  });

  it("never reports the restored resume position", async () => {
    const { adapter, controller, seeks } = await createSeekPlayer(30);
    expect(adapter.calls).toContain("seek:30");
    adapter.emit("seeking", { currentTime: 30, readyState: "buffering" });
    adapter.emit("seeked", { currentTime: 30, readyState: "ready" });
    expect(seeks()).toEqual([]);
    await controller.teardown();
  });

  it("reports a seek the viewer makes on paused media after the end", async () => {
    const { adapter, controller, end, seeks } = await createSeekPlayer();
    end();
    adapter.emit("seeking", { currentTime: 10, readyState: "buffering" });
    adapter.emit("seeked", { currentTime: 10, readyState: "ready" });
    expect(seeks()).toEqual([
      expect.objectContaining({
        currentTime: 10,
        from: 100,
        initiator: "media",
      }),
    ]);
    await controller.teardown();
  });
});
