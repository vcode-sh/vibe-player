import { afterEach, describe, expect, it, vi } from "vitest";
import { createYouTubeAdapter } from "./create-youtube-adapter";
import {
  collectYouTubeAdapterEvents,
  createYouTubeRuntime,
  getYouTubeSession,
  youtubeSource,
} from "./youtube-adapter-test-helpers";
import { youtubePlayerStates } from "./youtube-iframe-types";

function createGate() {
  let resolve: () => void = () => undefined;
  let reject: (error: Error) => void = () => undefined;
  const promise = new Promise<void>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
}

describe("YouTube asynchronous load ownership", () => {
  afterEach(() => vi.useRealTimers());

  it("destroys a late player and ignores its callbacks after unmount", async () => {
    vi.useFakeTimers();
    const gate = createGate();
    const { probe, runtime } = createYouTubeRuntime();
    const adapter = createYouTubeAdapter({
      createPlayer: (session) => {
        const handle = runtime.createPlayer(session);
        return gate.promise.then(() => handle);
      },
    });
    await adapter.mount(document.createElement("div"));
    const pending = adapter.load(youtubeSource);
    const events = collectYouTubeAdapterEvents(adapter);
    const obsoleteSession = getYouTubeSession(probe);
    await adapter.unmount();
    gate.resolve();
    await pending;
    obsoleteSession.onReady();
    obsoleteSession.onStateChange(youtubePlayerStates.playing);
    obsoleteSession.onError({ code: 100, message: "Deleted old video" });
    vi.advanceTimersByTime(1000);

    expect(probe.destroyed).toBe(true);
    expect(adapter.getSnapshot().readyState).toBe("idle");
    expect(adapter.capabilities.supportsPlayback).toBe(false);
    expect(events).toEqual([]);
  });

  it.each(["resolve", "reject"] as const)(
    "keeps the newer player when an obsolete creation settles by %s",
    async (completion) => {
      const gate = createGate();
      const old = createYouTubeRuntime();
      const current = createYouTubeRuntime();
      current.probe.currentTime = 47;
      const adapter = createYouTubeAdapter({
        createPlayer: (session) => {
          if (session.videoId === "new-video") {
            return current.runtime.createPlayer(session);
          }
          const handle = old.runtime.createPlayer(session);
          return gate.promise.then(() => handle);
        },
      });
      await adapter.mount(document.createElement("div"));
      const pending = adapter.load(youtubeSource);
      const outcome = pending.catch((error: unknown) => error);
      await adapter.load({ ...youtubeSource, youtubeVideoId: "new-video" });
      if (completion === "resolve") {
        gate.resolve();
      } else {
        gate.reject(new Error("Old creation failed"));
      }
      await outcome;
      await adapter.play();
      getYouTubeSession(current.probe).onStateChange(
        youtubePlayerStates.playing
      );
      const events = collectYouTubeAdapterEvents(adapter);
      getYouTubeSession(old.probe).onStateChange(youtubePlayerStates.ended);
      getYouTubeSession(old.probe).onError({
        code: 100,
        message: "Obsolete error",
      });

      expect(adapter.getSnapshot()).toMatchObject({
        currentTime: 47,
        paused: false,
        readyState: "playing",
      });
      expect(events).toEqual([]);
      expect(current.probe.destroyed).toBe(false);
      expect(current.probe.actions).toEqual(["play"]);
      expect(old.probe.actions).toEqual([]);
      await adapter.unmount();
      expect(current.probe.destroyed).toBe(true);
    }
  );
});
