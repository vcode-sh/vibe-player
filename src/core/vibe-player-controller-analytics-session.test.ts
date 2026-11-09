import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { VibePlayerController } from "./vibe-player-controller";
import { fileSource, TestAdapter } from "./vibe-player-controller-test-helpers";
import type {
  VibePlayerAnalyticsEvent,
  VibePlayerControllerOptions,
} from "./vibe-player-types";
import { playTestAdapter } from "./vibe-player-watched-test-helpers";

/** Every attach gets a fresh adapter, as with the built-in providers. */
async function createAnalyticsPlayer(
  options: Partial<VibePlayerControllerOptions> = {}
) {
  const adapters: TestAdapter[] = [];
  const analytics: VibePlayerAnalyticsEvent[] = [];
  const controller = new VibePlayerController({
    ...options,
    adapterFactory: () => {
      const adapter = new TestAdapter();
      adapters.push(adapter);
      return adapter;
    },
    onAnalyticsEvent: (event) => {
      analytics.push(event);
    },
  });
  await controller.load(fileSource);
  const current = () => {
    const adapter = adapters.at(-1);
    if (!adapter) {
      throw new Error("No adapter attached");
    }
    return adapter;
  };
  /** Starts the current adapter on an 8-second media. */
  const start = (currentTime: number) => {
    current().emit("durationchange", { duration: 8 });
    current().emit("play", { currentTime, paused: false });
  };
  const types = () => analytics.map(({ type }) => type);
  return { analytics, controller, current, start, types };
}

const target = document.createElement("div");

describe("VibePlayerController analytics session", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it.each([
    {
      act: (controller: VibePlayerController) => controller.retry(),
      way: "retry",
    },
    {
      act: (controller: VibePlayerController) => controller.retry(),
      renewSource: () =>
        Promise.resolve({ ...fileSource, expiresAt: Date.now() + 600_000 }),
      way: "renewal",
    },
    {
      act: async (controller: VibePlayerController) => {
        await controller.stop();
        await controller.play();
      },
      way: "stop and play",
    },
    {
      act: async (controller: VibePlayerController) => {
        await controller.unmount();
        await controller.mount(target);
        await controller.play();
      },
      way: "unmount and remount",
    },
  ])(
    "keeps one session across $way of the same source",
    async ({ act, renewSource }) => {
      const player = await createAnalyticsPlayer({ renewSource });
      player.start(0);
      playTestAdapter(player.current(), 0, 2);
      await act(player.controller);
      player.start(2);
      playTestAdapter(player.current(), 2, 3);
      await player.controller.teardown();

      expect(player.types()).toEqual([
        "opened",
        "started",
        "progress_25",
        "closed",
      ]);
    }
  );

  it("starts a new playback after the end, completing each playback once", async () => {
    const player = await createAnalyticsPlayer();
    player.start(0);
    playTestAdapter(player.current(), 0, 8);
    player.current().emit("ended", { paused: true, readyState: "ended" });
    player.current().emit("ended", { paused: true, readyState: "ended" });
    await player.controller.play();
    player.current().emit("play", { currentTime: 0, paused: false });
    playTestAdapter(player.current(), 4, 8);
    player.current().emit("ended", { paused: true, readyState: "ended" });
    await player.controller.teardown();

    expect(
      player.analytics.map(({ currentTime, type }) => [type, currentTime])
    ).toEqual([
      ["opened", undefined],
      ["started", 0],
      ["progress_25", 2],
      ["progress_50", 4],
      ["progress_75", 6],
      ["completed", 8],
      ["started", 0],
      ["progress_25", 6],
      ["progress_50", 8],
      ["completed", 8],
      ["closed", 8],
    ]);
  });

  it.each([
    { source: fileSource, which: "the same source again" },
    { source: { ...fileSource, id: "video-2" }, which: "another source" },
  ])("opens a new session when the host loads $which", async ({ source }) => {
    const player = await createAnalyticsPlayer();
    player.start(0);
    await player.controller.load(source);
    player.start(0);

    expect(
      player.analytics.map(({ sourceId, type }) => [type, sourceId])
    ).toEqual([
      ["opened", "video-1"],
      ["started", "video-1"],
      ["closed", "video-1"],
      ["opened", source.id],
      ["started", source.id],
    ]);
    await player.controller.teardown();
  });

  it("reports closed only for a session that opened", async () => {
    const adapter = new TestAdapter();
    adapter.loadError = new Error("Media unavailable");
    const analytics: VibePlayerAnalyticsEvent[] = [];
    const controller = new VibePlayerController({
      adapterFactory: () => adapter,
      onAnalyticsEvent: (event) => {
        analytics.push(event);
      },
    });
    await expect(controller.load(fileSource)).rejects.toThrow(
      "Media unavailable"
    );
    await controller.closeSource();

    expect(analytics.map(({ type }) => type)).toEqual(["error"]);
  });
});
