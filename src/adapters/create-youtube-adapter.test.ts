import { afterEach, describe, expect, it, vi } from "vitest";
import type { VibePlayerFileSource } from "../core/vibe-player-types";
import { createVibePlayerAdapter } from "./create-vibe-player-adapter";
import { createYouTubeAdapter } from "./create-youtube-adapter";
import {
  collectYouTubeAdapterEvents,
  createStalledYouTubeRuntime,
  createYouTubeRuntime,
  getYouTubeSession,
  youtubeSource,
} from "./youtube-adapter-test-helpers";
import { youtubePlayerStates } from "./youtube-iframe-types";

describe("createYouTubeAdapter", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("loads YouTube videos through an iframe runtime bridge", async () => {
    const { probe, runtime } = createYouTubeRuntime();
    const adapter = createYouTubeAdapter(runtime);
    const target = document.createElement("div");

    await adapter.mount(target);
    await adapter.load(youtubeSource);
    getYouTubeSession(probe).onReady();

    expect(getYouTubeSession(probe).videoId).toBe(youtubeSource.youtubeVideoId);
    expect(getYouTubeSession(probe).startSeconds).toBe(12);
    expect(target.querySelector("iframe")).toBe(probe.iframe);
    expect(adapter.getSnapshot().readyState).toBe("ready");
    expect(adapter.kind).toBe("youtube");
    expect(adapter.capabilities.canShowCaptions).toBe(false);
    expect(adapter.capabilities.hasNativeCaptionsMenu).toBe(true);
    expect(adapter.capabilities.canFullscreen).toBe(true);
    expect(adapter.capabilities.supportsPlayback).toBe(true);
  });

  it("normalizes state changes and sampled time updates", async () => {
    vi.useFakeTimers();
    const { probe, runtime } = createYouTubeRuntime();
    const adapter = createYouTubeAdapter(runtime);
    const target = document.createElement("div");
    const events = collectYouTubeAdapterEvents(adapter);

    await adapter.mount(target);
    await adapter.load(youtubeSource);
    await adapter.play();
    probe.currentTime = 25;
    getYouTubeSession(probe).onStateChange(youtubePlayerStates.playing);
    probe.currentTime = 26;
    vi.advanceTimersByTime(500);

    expect(events.map((event) => event.type)).toContain("play");
    expect(events.at(-1)?.type).toBe("timeupdate");
    expect(events.at(-1)?.snapshot).toMatchObject({
      bufferedPct: 50,
      currentTime: 26,
      duration: 180,
      paused: false,
      readyState: "playing",
      volume: 0.75,
    });

    getYouTubeSession(probe).onStateChange(youtubePlayerStates.buffering);
    await vi.advanceTimersByTimeAsync(2500);
    expect(events.at(-1)?.type).toBe("buffering");
    getYouTubeSession(probe).onStateChange(youtubePlayerStates.paused);
    expect(events.at(-1)?.type).toBe("pause");
    getYouTubeSession(probe).onStateChange(youtubePlayerStates.ended);
    expect(events.at(-1)?.type).toBe("ended");
  });

  it("does not emit playblocked after quick playback progress", async () => {
    vi.useFakeTimers();
    const { probe, runtime } = createYouTubeRuntime();
    const adapter = createYouTubeAdapter(runtime);
    const target = document.createElement("div");
    const events = collectYouTubeAdapterEvents(adapter);

    await adapter.mount(target);
    await adapter.load(youtubeSource);
    await adapter.play();
    probe.currentTime = 12.2;
    getYouTubeSession(probe).onStateChange(youtubePlayerStates.paused);
    await vi.advanceTimersByTimeAsync(2500);

    expect(events.at(-1)?.type).toBe("pause");
  });

  it("emits playblocked when YouTube stalls after a play command", async () => {
    vi.useFakeTimers();
    const { probe, runtime } = createYouTubeRuntime();
    const adapter = createYouTubeAdapter(runtime);
    const target = document.createElement("div");
    const events = collectYouTubeAdapterEvents(adapter);

    await adapter.mount(target);
    await adapter.load(youtubeSource);
    await adapter.play();
    getYouTubeSession(probe).onStateChange(youtubePlayerStates.playing);
    getYouTubeSession(probe).onStateChange(youtubePlayerStates.paused);
    getYouTubeSession(probe).onStateChange(youtubePlayerStates.buffering);
    await vi.advanceTimersByTimeAsync(2500);

    expect(events.at(-1)?.type).toBe("playblocked");
    expect(events.at(-1)?.snapshot.readyState).toBe("buffering");
  });

  it("forwards commands and clamps seek and volume values", async () => {
    const { probe, runtime } = createYouTubeRuntime();
    const adapter = createYouTubeAdapter(runtime);
    const target = document.createElement("div");
    await adapter.mount(target);
    await adapter.load(youtubeSource);

    await adapter.play();
    await adapter.pause();
    await adapter.seekTo(250);
    await adapter.setMuted(true);
    await adapter.setMuted(false);
    await adapter.setPlaybackRate(1.5);
    await adapter.setVolume(2);
    await adapter.enterFullscreen?.();
    await adapter.unmount();

    expect(probe.actions).toEqual([
      "play",
      "pause",
      "seek:180",
      "mute",
      "unmute",
      "rate:1.5",
      "volume:100",
    ]);
    expect(probe.destroyed).toBe(true);
  });

  it("returns idle state and capabilities after unmount", async () => {
    const { probe, runtime } = createYouTubeRuntime();
    const adapter = createYouTubeAdapter(runtime);
    const target = document.createElement("div");

    await adapter.mount(target);
    await adapter.load(youtubeSource);
    expect(adapter.capabilities.canSeek).toBe(true);

    await adapter.unmount();

    expect(probe.destroyed).toBe(true);
    expect(adapter.getSnapshot().readyState).toBe("idle");
    expect(adapter.capabilities.canSeek).toBe(false);
    expect(adapter.capabilities.supportsVolumeControl).toBe(false);
  });

  it("rejects unsupported sources", async () => {
    const { runtime } = createYouTubeRuntime();
    const adapter = createYouTubeAdapter(runtime);
    const fileSource: VibePlayerFileSource = {
      id: "file",
      sources: [{ mimeType: "video/mp4", url: "https://example.com/file.mp4" }],
      type: "file",
    };

    await expect(adapter.load(fileSource)).rejects.toThrow(
      "YouTube adapter cannot load file sources."
    );
  });

  it("rejects stalled player creation instead of hanging", async () => {
    vi.useFakeTimers();
    const adapter = createYouTubeAdapter(createStalledYouTubeRuntime());
    const target = document.createElement("div");

    await adapter.mount(target);
    const pending = adapter.load(youtubeSource);
    const assertion = expect(pending).rejects.toThrow(
      "Timed out creating YouTube player."
    );
    await vi.advanceTimersByTimeAsync(8000);

    await assertion;
    expect(adapter.getSnapshot().readyState).toBe("idle");
    expect(adapter.capabilities.canSeek).toBe(false);
    expect(target.childElementCount).toBe(0);
  });

  it("is selected by the default adapter factory", () => {
    expect(createVibePlayerAdapter(youtubeSource).kind).toBe("youtube");
  });
});
