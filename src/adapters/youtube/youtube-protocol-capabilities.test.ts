import { afterEach, describe, expect, it, vi } from "vitest";
import { createYouTubeAdapter } from "./create-youtube-adapter";
import {
  collectYouTubeAdapterEvents,
  createYouTubeRuntime,
  getYouTubeSession,
  youtubeSource,
} from "./youtube-adapter-test-helpers";
import { youtubePlayerStates } from "./youtube-iframe-types";

// The SDK event identifies browser policy blocking; buffering is not that event.
describe("YouTube protocol capabilities", () => {
  afterEach(() => vi.useRealTimers());

  it("keeps slow buffering distinct from a confirmed autoplay block", async () => {
    vi.useFakeTimers();
    const { probe, runtime } = createYouTubeRuntime();
    const adapter = createYouTubeAdapter(runtime);
    await adapter.mount(document.createElement("div"));
    await adapter.load(youtubeSource);
    const events = collectYouTubeAdapterEvents(adapter);
    await adapter.play();
    getYouTubeSession(probe).onStateChange(youtubePlayerStates.buffering);
    await vi.advanceTimersByTimeAsync(10_000);
    expect(events.map((event) => event.type)).toEqual(["buffering"]);

    getYouTubeSession(probe).onAutoplayBlocked?.();
    expect(events.at(-1)?.type).toBe("playblocked");
    getYouTubeSession(probe).onAutoplayBlocked?.();
    expect(events.filter((event) => event.type === "playblocked")).toHaveLength(
      1
    );
    await adapter.unmount();
  });

  it("ignores late blocking after pause or confirmed playback", async () => {
    const { probe, runtime } = createYouTubeRuntime();
    const adapter = createYouTubeAdapter(runtime);
    await adapter.mount(document.createElement("div"));
    await adapter.load(youtubeSource);
    const events = collectYouTubeAdapterEvents(adapter);
    await adapter.play();
    await adapter.pause();
    getYouTubeSession(probe).onAutoplayBlocked?.();
    await adapter.play();
    getYouTubeSession(probe).onStateChange(youtubePlayerStates.playing);
    getYouTubeSession(probe).onAutoplayBlocked?.();
    expect(events.map((event) => event.type)).toEqual(["play"]);
    await adapter.unmount();
  });

  it.each([
    { canSetRate: false, expected: [1], rates: [1] },
    { canSetRate: true, expected: [1, 1.5, 2], rates: [1, 1.5, 2] },
    {
      canSetRate: true,
      expected: [1, 1.5, 2],
      rates: [2, 1.5, 1, 1.5, 0, -1, Number.NaN, Number.POSITIVE_INFINITY],
    },
    { canSetRate: false, expected: [1], rates: [] },
  ])(
    "exposes provider rates $rates and honest speed capability",
    async ({ rates, expected, canSetRate }) => {
      const { runtime } = createYouTubeRuntime();
      const adapter = createYouTubeAdapter({
        createPlayer: (session) => ({
          ...runtime.createPlayer(session),
          getAvailablePlaybackRates: () => rates,
        }),
      });
      await adapter.mount(document.createElement("div"));
      await adapter.load(youtubeSource);
      expect(adapter.getSnapshot().playbackRates).toEqual(expected);
      expect(adapter.capabilities.canSetPlaybackRate).toBe(canSetRate);
      await adapter.unmount();
    }
  );
});
