import { afterEach, describe, expect, it, vi } from "vitest";
import type {
  VibePlayerAdapterEvent,
  VibePlayerFileSource,
  VibePlayerHlsSource,
} from "../core/vibe-player-types";
import { createFileAdapter } from "./create-file-adapter";

const fileSource: VibePlayerFileSource = {
  captions: [
    {
      default: true,
      id: "en",
      kind: "captions",
      label: "English",
      language: "en",
      url: "https://example.com/captions.vtt",
    },
  ],
  id: "file-video",
  posterUrl: "https://example.com/poster.jpg",
  sources: [
    {
      mimeType: "video/mp4",
      url: "https://example.com/video.mp4",
    },
    {
      mimeType: "video/webm",
      url: "https://example.com/video.webm",
    },
  ],
  title: "File video",
  type: "file",
};

function getMountedVideo(target: HTMLElement): HTMLVideoElement {
  const video = target.querySelector("video");
  if (!(video instanceof HTMLVideoElement)) {
    throw new Error("Expected mounted video element.");
  }
  return video;
}
function defineNumberProperty(
  element: HTMLVideoElement,
  key: "duration" | "readyState",
  value: number
): void {
  Object.defineProperty(element, key, {
    configurable: true,
    value,
  });
}

interface DeferredPlayback {
  promise: Promise<void>;
  resolve: () => void;
}

function createDeferredPlayback(): DeferredPlayback {
  let resolvePlayback: (() => void) | null = null;
  const promise = new Promise<void>((resolve) => {
    resolvePlayback = resolve;
  });
  return {
    promise,
    resolve: () => {
      if (!resolvePlayback) {
        throw new Error("Playback resolver was not initialized.");
      }
      resolvePlayback();
    },
  };
}

describe("createFileAdapter", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("mounts a native video element with sources, poster, and captions", async () => {
    vi.spyOn(HTMLMediaElement.prototype, "load").mockImplementation(
      () => undefined
    );
    const adapter = createFileAdapter();
    const target = document.createElement("div");

    await adapter.mount(target);
    await adapter.load(fileSource);

    const video = getMountedVideo(target);
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
    vi.spyOn(HTMLMediaElement.prototype, "load").mockImplementation(
      () => undefined
    );
    const adapter = createFileAdapter();
    const target = document.createElement("div");
    const singleFileSource: VibePlayerFileSource = {
      ...fileSource,
      autoPlay: true,
      sources: [
        {
          mimeType: "video/mp4",
          url: "https://example.com/video.mp4",
        },
      ],
    };

    await adapter.mount(target);
    await adapter.load(singleFileSource);

    const video = getMountedVideo(target);
    expect(video.autoplay).toBe(false);
    expect(video.src).toBe("https://example.com/video.mp4");
    expect(video.querySelector("source")).toBeNull();
  });

  it("keeps cross-origin configurable for file sources", async () => {
    vi.spyOn(HTMLMediaElement.prototype, "load").mockImplementation(
      () => undefined
    );
    const adapter = createFileAdapter();
    const target = document.createElement("div");

    await adapter.mount(target);
    await adapter.load({ ...fileSource, crossOrigin: "anonymous" });

    expect(getMountedVideo(target).crossOrigin).toBe("anonymous");
  });

  it("normalizes native media events into adapter events", async () => {
    vi.spyOn(HTMLMediaElement.prototype, "load").mockImplementation(
      () => undefined
    );
    const adapter = createFileAdapter();
    const target = document.createElement("div");
    const events: VibePlayerAdapterEvent[] = [];
    adapter.subscribe((event) => {
      events.push(event);
    });

    await adapter.mount(target);
    await adapter.load(fileSource);
    const video = getMountedVideo(target);
    defineNumberProperty(video, "duration", 120);
    video.currentTime = 30;
    video.dispatchEvent(new Event("timeupdate"));

    const lastEvent = events.at(-1);
    expect(lastEvent?.type).toBe("timeupdate");
    expect(lastEvent?.snapshot.currentTime).toBe(30);
    expect(lastEvent?.snapshot.duration).toBe(120);
  });

  it("forwards playback commands and clamps seek and volume values", async () => {
    vi.spyOn(HTMLMediaElement.prototype, "load").mockImplementation(
      () => undefined
    );
    const adapter = createFileAdapter();
    const target = document.createElement("div");
    await adapter.mount(target);
    await adapter.load(fileSource);

    const video = getMountedVideo(target);
    defineNumberProperty(video, "duration", 100);
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
    vi.spyOn(HTMLMediaElement.prototype, "load").mockImplementation(
      () => undefined
    );
    const adapter = createFileAdapter();
    const target = document.createElement("div");
    await adapter.mount(target);
    await adapter.load(fileSource);

    const video = getMountedVideo(target);
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
  });

  it("stops a pending playback request after pause", async () => {
    vi.spyOn(HTMLMediaElement.prototype, "load").mockImplementation(
      () => undefined
    );
    const adapter = createFileAdapter();
    const target = document.createElement("div");
    await adapter.mount(target);
    await adapter.load(fileSource);

    const video = getMountedVideo(target);
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
    vi.spyOn(HTMLMediaElement.prototype, "load").mockImplementation(
      () => undefined
    );
    const adapter = createFileAdapter();
    const target = document.createElement("div");
    await adapter.mount(target);
    await adapter.load(fileSource);

    const video = getMountedVideo(target);
    video.requestFullscreen = () => Promise.resolve();
    expect(adapter.capabilities.canFullscreen).toBe(true);
    await adapter.enterFullscreen?.();
  });

  it("rejects unsupported and empty file sources", async () => {
    const adapter = createFileAdapter();
    const hlsSource: VibePlayerHlsSource = {
      id: "hls",
      manifestUrl: "https://example.com/stream.m3u8",
      type: "hls",
    };

    await expect(adapter.load(hlsSource)).rejects.toThrow(
      "File adapter cannot load hls sources."
    );
    await expect(
      adapter.load({ id: "empty", sources: [], type: "file" })
    ).rejects.toThrow("File source must include at least one media source.");
  });
});
