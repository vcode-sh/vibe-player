import { afterEach, describe, expect, it, vi } from "vitest";
import type { VibePlayerAdapterEvent } from "../core/vibe-player-types";
import { createFileAdapter } from "./create-file-adapter";
import {
  createLoadedFileAdapter,
  createSingleFileSource,
  emptyFileSource,
  fileSource,
  hlsSource,
} from "./file-adapter-test-helpers";
import {
  createDeferredPlayback,
  defineNativeVideoNumberProperty,
} from "./native-video-test-helpers";

describe("createFileAdapter", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("mounts a native video element with sources, poster, and captions", async () => {
    const { adapter, video } = await createLoadedFileAdapter();
    const sources = Array.from(video.querySelectorAll("source"));
    const tracks = Array.from(video.querySelectorAll("track"));
    expect(video.poster).toBe(fileSource.posterUrl);
    expect(video.preload).toBe("metadata");
    expect(video.crossOrigin).toBeNull();
    expect(video.playsInline).toBe(true);
    expect(sources.map((source) => source.type)).toEqual([
      "video/mp4",
      "video/webm",
    ]);
    expect(sources.map((source) => source.src)).toEqual([
      "https://example.com/video.mp4",
      "https://example.com/video.webm",
    ]);
    expect(tracks.map((track) => track.kind)).toEqual(["captions"]);
    expect(tracks.map((track) => track.srclang)).toEqual(["en"]);
    expect(tracks.map((track) => track.default)).toEqual([false]);
    expect(adapter.capabilities.canShowCaptions).toBe(true);
    expect(adapter.capabilities.supportsPoster).toBe(true);
  });

  it("uses the native video src for a single file source", async () => {
    const { video } = await createLoadedFileAdapter(createSingleFileSource());
    expect(video.autoplay).toBe(false);
    expect(video.src).toBe("https://example.com/video.mp4");
    expect(video.querySelector("source")).toBeNull();
  });

  it("keeps cross-origin configurable for file sources", async () => {
    const { video } = await createLoadedFileAdapter({
      ...fileSource,
      crossOrigin: "anonymous",
    });
    expect(video.crossOrigin).toBe("anonymous");
  });

  it("normalizes native media events into adapter events", async () => {
    const { adapter, video } = await createLoadedFileAdapter();
    const events: VibePlayerAdapterEvent[] = [];
    adapter.subscribe((event) => {
      events.push(event);
    });

    defineNativeVideoNumberProperty(video, "duration", 120);
    video.currentTime = 30;
    video.dispatchEvent(new Event("timeupdate"));

    const lastEvent = events.at(-1);
    expect(lastEvent?.type).toBe("timeupdate");
    expect(lastEvent?.snapshot.currentTime).toBe(30);
    expect(lastEvent?.snapshot.duration).toBe(120);
  });

  it("forwards playback commands and clamps seek and volume values", async () => {
    const { adapter, video } = await createLoadedFileAdapter();
    defineNativeVideoNumberProperty(video, "duration", 100);
    video.play = () => Promise.resolve();
    video.pause = () => undefined;

    await adapter.play();
    await adapter.pause();
    await adapter.seekTo(120);
    await adapter.setMuted(true);
    await adapter.setPlaybackRate(1.25);
    await adapter.setVolume(2);

    expect(video.currentTime).toBe(100);
    expect(video.muted).toBe(true);
    expect(video.playbackRate).toBe(1.25);
    expect(video.volume).toBe(1);
  });

  it("stops a pending playback request after unmount", async () => {
    const { adapter, video } = await createLoadedFileAdapter();
    const playback = createDeferredPlayback();
    const pauseSpy = vi.fn(() => undefined);
    video.play = () => playback.promise;
    video.pause = pauseSpy;

    const playPromise = adapter.play();
    await adapter.unmount();
    playback.resolve();
    await playPromise;

    expect(pauseSpy).toHaveBeenCalledTimes(2);
    expect(video.isConnected).toBe(false);
    expect(video.getAttribute("src")).toBeNull();
    expect(adapter.getSnapshot().readyState).toBe("idle");
    expect(adapter.capabilities.canSeek).toBe(false);
    expect(adapter.capabilities.supportsVolumeControl).toBe(false);
  });

  it("stops a pending playback request after pause", async () => {
    const { adapter, video } = await createLoadedFileAdapter();
    const playback = createDeferredPlayback();
    const pauseSpy = vi.fn(() => undefined);
    video.play = () => playback.promise;
    video.pause = pauseSpy;

    const playPromise = adapter.play();
    await adapter.pause();
    playback.resolve();
    await playPromise;

    expect(pauseSpy).toHaveBeenCalledTimes(2);
  });

  it("uses fullscreen only when the mounted video supports it", async () => {
    const { adapter, video } = await createLoadedFileAdapter();
    video.requestFullscreen = () => Promise.resolve();
    expect(adapter.capabilities.canFullscreen).toBe(true);
    await adapter.enterFullscreen?.();
  });

  it("rejects unsupported and empty file sources", async () => {
    const adapter = createFileAdapter();

    await expect(adapter.load(hlsSource)).rejects.toThrow(
      "File adapter cannot load hls sources."
    );
    await expect(adapter.load(emptyFileSource)).rejects.toThrow(
      "File source must include at least one media source."
    );
  });
});
