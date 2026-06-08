import { afterEach, describe, expect, it, vi } from "vitest";
import type {
  VibePlayerAdapterEvent,
  VibePlayerFileSource,
  VibePlayerHlsSource,
} from "../core/vibe-player-types";
import {
  createHlsAdapter,
  type HlsAdapterRuntime,
  type ManagedHlsSession,
} from "./create-hls-adapter";
import { createVibePlayerAdapter } from "./create-vibe-player-adapter";

const hlsSource: VibePlayerHlsSource = {
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
  id: "hls-video",
  manifestUrl: "https://example.com/stream.m3u8",
  posterUrl: "https://example.com/poster.jpg",
  title: "HLS video",
  type: "hls",
};

interface RuntimeProbe {
  attachCount: number;
  session: ManagedHlsSession | null;
  teardownCount: number;
}

function createRuntime(canUseManagedHls = true): {
  probe: RuntimeProbe;
  runtime: HlsAdapterRuntime;
} {
  const probe: RuntimeProbe = {
    attachCount: 0,
    session: null,
    teardownCount: 0,
  };
  return {
    probe,
    runtime: {
      attachManagedHls(session) {
        probe.attachCount += 1;
        probe.session = session;
        return () => {
          probe.teardownCount += 1;
        };
      },
      canUseManagedHls: () => canUseManagedHls,
    },
  };
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

function getMountedVideo(target: HTMLElement): HTMLVideoElement {
  const video = target.querySelector("video");
  if (!(video instanceof HTMLVideoElement)) {
    throw new Error("Expected mounted video element.");
  }
  return video;
}

function getManagedSession(probe: RuntimeProbe): ManagedHlsSession {
  if (!probe.session) {
    throw new Error("Expected managed HLS session.");
  }
  return probe.session;
}

describe("createHlsAdapter", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("loads managed HLS through the runtime bridge", async () => {
    vi.spyOn(HTMLMediaElement.prototype, "canPlayType").mockReturnValue("");
    vi.spyOn(HTMLMediaElement.prototype, "load").mockImplementation(
      () => undefined
    );
    const { probe, runtime } = createRuntime();
    const adapter = createHlsAdapter(runtime);
    const target = document.createElement("div");
    const events: VibePlayerAdapterEvent[] = [];
    adapter.subscribe((event) => {
      events.push(event);
    });

    await adapter.mount(target);
    await adapter.load(hlsSource);

    const video = getMountedVideo(target);
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
    const { probe, runtime } = createRuntime(false);
    const adapter = createHlsAdapter(runtime);
    const target = document.createElement("div");

    await adapter.mount(target);
    await adapter.load(hlsSource);

    const video = getMountedVideo(target);
    expect(video.src).toBe(hlsSource.manifestUrl);
    expect(probe.attachCount).toBe(0);
    expect(adapter.capabilities.canSeek).toBe(true);
  });

  it("updates live capabilities from HLS level metadata", async () => {
    vi.spyOn(HTMLMediaElement.prototype, "canPlayType").mockReturnValue("");
    vi.spyOn(HTMLMediaElement.prototype, "load").mockImplementation(
      () => undefined
    );
    const { probe, runtime } = createRuntime();
    const adapter = createHlsAdapter(runtime);
    const target = document.createElement("div");
    await adapter.mount(target);
    await adapter.load({ ...hlsSource, live: true });

    const video = getMountedVideo(target);
    defineNumberProperty(video, "duration", 120);
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
    const { probe, runtime } = createRuntime();
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
  });

  it("rejects unsupported sources and unavailable HLS runtimes", async () => {
    vi.spyOn(HTMLMediaElement.prototype, "canPlayType").mockReturnValue("");
    const { runtime } = createRuntime(false);
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
