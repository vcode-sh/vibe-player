import { afterEach, describe, expect, it, vi } from "vitest";
import type {
  VibePlayerAdapterEvent,
  VibePlayerFileSource,
} from "../core/vibe-player-types";
import { createHlsAdapter } from "./create-hls-adapter";
import { createVibePlayerAdapter } from "./create-vibe-player-adapter";
import {
  createHlsRuntime,
  getManagedSession,
  hlsSource,
} from "./hls-adapter-test-helpers";
import {
  createDeferredPlayback,
  defineNativeVideoNumberProperty,
  getMountedNativeVideo,
} from "./native-video-test-helpers";

describe("createHlsAdapter", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("loads managed HLS through the runtime bridge", async () => {
    vi.spyOn(HTMLMediaElement.prototype, "canPlayType").mockReturnValue("");
    vi.spyOn(HTMLMediaElement.prototype, "load").mockImplementation(
      () => undefined
    );
    const { probe, runtime } = createHlsRuntime();
    const adapter = createHlsAdapter(runtime);
    const target = document.createElement("div");
    const events: VibePlayerAdapterEvent[] = [];
    adapter.subscribe((event) => {
      events.push(event);
    });

    await adapter.mount(target);
    await adapter.load(hlsSource);

    const video = getMountedNativeVideo(target);
    const tracks = Array.from(video.querySelectorAll("track"));
    const session = getManagedSession(probe);
    expect(session.manifestUrl).toBe(hlsSource.manifestUrl);
    expect(session.video).toBe(video);
    expect(probe.attachCount).toBe(1);
    expect(video.poster).toBe(hlsSource.posterUrl);
    expect(tracks.map((track) => track.default)).toEqual([false]);
    expect(adapter.capabilities.canShowCaptions).toBe(true);

    session.onReady();
    expect(events.at(-1)?.type).toBe("ready");
  });

  it("uses native HLS when the browser can play the manifest directly", async () => {
    vi.spyOn(HTMLMediaElement.prototype, "canPlayType").mockImplementation(
      (mimeType) =>
        mimeType === "application/vnd.apple.mpegurl" ? "probably" : ""
    );
    vi.spyOn(HTMLMediaElement.prototype, "load").mockImplementation(
      () => undefined
    );
    const { probe, runtime } = createHlsRuntime(false);
    const adapter = createHlsAdapter(runtime);
    const target = document.createElement("div");

    await adapter.mount(target);
    await adapter.load(hlsSource);

    const video = getMountedNativeVideo(target);
    expect(video.src).toBe(hlsSource.manifestUrl);
    expect(probe.attachCount).toBe(0);
    expect(adapter.capabilities.canSeek).toBe(true);
  });

  it("updates live capabilities from HLS level metadata", async () => {
    vi.spyOn(HTMLMediaElement.prototype, "canPlayType").mockReturnValue("");
    vi.spyOn(HTMLMediaElement.prototype, "load").mockImplementation(
      () => undefined
    );
    const { probe, runtime } = createHlsRuntime();
    const adapter = createHlsAdapter(runtime);
    const target = document.createElement("div");
    await adapter.mount(target);
    await adapter.load({ ...hlsSource, live: true });

    const video = getMountedNativeVideo(target);
    defineNativeVideoNumberProperty(video, "duration", 120);
    await adapter.seekTo(30);
    expect(video.currentTime).toBe(0);
    expect(adapter.capabilities.canSeek).toBe(false);
    expect(adapter.capabilities.supportsDuration).toBe(false);
    expect(adapter.getSnapshot().duration).toBe(0);

    getManagedSession(probe).onLevelLoaded(false);
    await adapter.seekTo(30);
    expect(video.currentTime).toBe(30);
    expect(adapter.capabilities.canSeek).toBe(true);
  });

  it("emits normalized HLS errors and tears down managed sessions", async () => {
    vi.spyOn(HTMLMediaElement.prototype, "canPlayType").mockReturnValue("");
    vi.spyOn(HTMLMediaElement.prototype, "load").mockImplementation(
      () => undefined
    );
    const { probe, runtime } = createHlsRuntime();
    const adapter = createHlsAdapter(runtime);
    const target = document.createElement("div");
    const events: VibePlayerAdapterEvent[] = [];
    adapter.subscribe((event) => {
      events.push(event);
    });

    await adapter.mount(target);
    await adapter.load(hlsSource);
    getManagedSession(probe).onError({
      details: "manifestLoadError",
      fatal: true,
      message: "manifest failed",
      type: "networkError",
    });
    await adapter.unmount();

    expect(events.at(-1)?.type).toBe("error");
    expect(events.at(-1)?.payload).toMatchObject({
      details: "manifestLoadError",
      fatal: true,
      type: "networkError",
    });
    expect(probe.teardownCount).toBe(1);
    expect(adapter.getSnapshot().readyState).toBe("idle");
    expect(adapter.capabilities.canSeek).toBe(false);
    expect(adapter.capabilities.supportsVolumeControl).toBe(false);
  });

  it("stops a pending playback request after pause", async () => {
    vi.spyOn(HTMLMediaElement.prototype, "canPlayType").mockReturnValue("");
    vi.spyOn(HTMLMediaElement.prototype, "load").mockImplementation(
      () => undefined
    );
    const { runtime } = createHlsRuntime();
    const adapter = createHlsAdapter(runtime);
    const target = document.createElement("div");
    await adapter.mount(target);
    await adapter.load(hlsSource);

    const video = getMountedNativeVideo(target);
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

  it("rejects unsupported sources and unavailable HLS runtimes", async () => {
    vi.spyOn(HTMLMediaElement.prototype, "canPlayType").mockReturnValue("");
    const { runtime } = createHlsRuntime(false);
    const adapter = createHlsAdapter(runtime);
    const fileSource: VibePlayerFileSource = {
      id: "file",
      sources: [{ mimeType: "video/mp4", url: "https://example.com/file.mp4" }],
      type: "file",
    };

    await expect(adapter.load(fileSource)).rejects.toThrow(
      "HLS adapter cannot load file sources."
    );
    await expect(adapter.load(hlsSource)).rejects.toThrow(
      "HLS playback requires native HLS or MediaSource support."
    );
  });

  it("is selected by the default adapter factory", () => {
    expect(createVibePlayerAdapter(hlsSource).kind).toBe("hls");
  });
});
