import { afterEach, describe, expect, it, vi } from "vitest";
import {
  collectYouTubeAdapterEvents,
  createYouTubeRuntime,
  createYouTubeTestAdapter,
  getYouTubeSession,
  youtubeSource,
} from "./youtube-adapter-test-helpers";
import { youtubePlayerStates } from "./youtube-iframe-types";
import { createReadyYouTubePlayer } from "./youtube-player-creation";
import { createDelayedYouTubeApi } from "./youtube-player-readiness-test-helpers";

describe("YouTube provider event lifecycle", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it.each([
    { event: "pause", expected: "ready", state: youtubePlayerStates.paused },
    { event: "timeupdate", expected: "ready", state: youtubePlayerStates.cued },
    {
      event: "buffering",
      expected: "buffering",
      state: youtubePlayerStates.buffering,
    },
    { event: "ended", expected: "ended", state: youtubePlayerStates.ended },
  ] as const)(
    "stops time sampling for provider state $state",
    async ({ event, expected, state }) => {
      vi.useFakeTimers();
      const { probe, runtime } = createYouTubeRuntime();
      const adapter = createYouTubeTestAdapter(runtime);
      const events = collectYouTubeAdapterEvents(adapter);
      await adapter.mount(document.createElement("div"));
      await adapter.load(youtubeSource);
      const session = getYouTubeSession(probe);

      session.onStateChange(youtubePlayerStates.playing);
      probe.currentTime = 17;
      vi.advanceTimersByTime(500);
      expect(events.at(-1)).toMatchObject({
        snapshot: { currentTime: 17, paused: false },
        type: "timeupdate",
      });
      session.onStateChange(state);
      expect(events.at(-1)?.type).toBe(event);
      const countAfterStop = events.length;
      probe.currentTime = 19;
      vi.advanceTimersByTime(1000);
      expect(events).toHaveLength(countAfterStop);
      expect(adapter.getSnapshot()).toMatchObject({
        paused: true,
        readyState: expected,
      });
      await adapter.unmount();
    }
  );

  it("does not mistake a completed short video for blocked playback", async () => {
    vi.useFakeTimers();
    const { probe, runtime } = createYouTubeRuntime();
    const adapter = createYouTubeTestAdapter(runtime);
    const events = collectYouTubeAdapterEvents(adapter);
    await adapter.mount(document.createElement("div"));
    await adapter.load(youtubeSource);

    await adapter.play();
    getYouTubeSession(probe).onStateChange(youtubePlayerStates.ended);
    getYouTubeSession(probe).onAutoplayBlocked?.();

    expect(events.at(-1)).toMatchObject({
      snapshot: { paused: true, readyState: "ended" },
      type: "ended",
    });
    expect(events.map((event) => event.type)).not.toContain("playblocked");
    await adapter.unmount();
  });

  it("normalizes current SDK rate and error events and silences disposed players", async () => {
    const { api, getPlayer } = createDelayedYouTubeApi();
    const adapter = createYouTubeTestAdapter({
      createPlayer: (session) => createReadyYouTubePlayer(api, session),
    });
    await adapter.mount(document.createElement("div"));
    const loading = adapter.load(youtubeSource);
    const player = getPlayer();
    player.signalReady();
    await loading;
    const events = collectYouTubeAdapterEvents(adapter);

    player.signalPlaybackRateChange(1.5);
    player.signalError(100);
    expect(events).toEqual([
      expect.objectContaining({
        snapshot: expect.objectContaining({ playbackRate: 1.5 }),
        type: "ratechange",
      }),
      expect.objectContaining({
        payload: { code: 100, message: "YouTube player error 100" },
        type: "error",
      }),
    ]);
    await adapter.unmount();
    player.signalPlaybackRateChange(2);
    player.signalError(150);
    expect(events).toHaveLength(2);
  });
});
