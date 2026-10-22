import { afterEach, describe, expect, it, vi } from "vitest";
import { createYouTubeAdapter } from "./create-youtube-adapter";
import {
  collectYouTubeAdapterEvents,
  createYouTubeRuntime,
  getYouTubeSession,
  youtubeSource,
} from "./youtube-adapter-test-helpers";
import { youtubePlayerStates } from "./youtube-iframe-types";

describe("YouTube provider event lifecycle", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it.each([
    { expected: "ready", state: youtubePlayerStates.paused },
    { expected: "ready", state: youtubePlayerStates.cued },
    { expected: "buffering", state: youtubePlayerStates.buffering },
    { expected: "ended", state: youtubePlayerStates.ended },
  ] as const)(
    "stops time sampling for provider state $state",
    async ({ expected, state }) => {
      vi.useFakeTimers();
      const { probe, runtime } = createYouTubeRuntime();
      const adapter = createYouTubeAdapter(runtime);
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
    const adapter = createYouTubeAdapter(runtime);
    const events = collectYouTubeAdapterEvents(adapter);
    await adapter.mount(document.createElement("div"));
    await adapter.load(youtubeSource);

    await adapter.play();
    getYouTubeSession(probe).onStateChange(youtubePlayerStates.ended);
    vi.advanceTimersByTime(3000);

    expect(events.at(-1)).toMatchObject({
      snapshot: { paused: true, readyState: "ended" },
      type: "ended",
    });
    expect(events.map((event) => event.type)).not.toContain("playblocked");
    await adapter.unmount();
  });
});
