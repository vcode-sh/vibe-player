import { afterEach, describe, expect, it, vi } from "vitest";
import type {
  YouTubeIframeApi,
  YouTubeIframePlayerOptions,
  YouTubePlayerHandle,
} from "./youtube-iframe-types";

const youtubeIframeApiSrc = "https://www.youtube.com/iframe_api";
let fakePlayerCommandCount = 0;
let fakePlayerOptions: YouTubeIframePlayerOptions | null = null;

class FakeYouTubePlayer implements YouTubePlayerHandle {
  constructor(_element: HTMLElement, options: YouTubeIframePlayerOptions) {
    fakePlayerOptions = options;
  }

  destroy(): void {
    fakePlayerCommandCount += 1;
  }
  getCurrentTime(): number {
    return 0;
  }
  getDuration(): number {
    return 0;
  }
  getPlaybackRate(): number {
    return 1;
  }
  getVolume(): number {
    return 100;
  }
  isMuted(): boolean {
    return false;
  }
  mute(): void {
    fakePlayerCommandCount += 1;
  }
  pauseVideo(): void {
    fakePlayerCommandCount += 1;
  }
  playVideo(): void {
    fakePlayerCommandCount += 1;
  }
  seekTo(): void {
    fakePlayerCommandCount += 1;
  }
  setPlaybackRate(): void {
    fakePlayerCommandCount += 1;
  }
  setVolume(): void {
    fakePlayerCommandCount += 1;
  }
  unMute(): void {
    fakePlayerCommandCount += 1;
  }
}

function createApi(): YouTubeIframeApi {
  return { Player: FakeYouTubePlayer };
}

async function importRuntime() {
  vi.resetModules();
  return await import("./youtube-iframe-runtime");
}

function cleanupYouTubeGlobals(): void {
  window.YT = undefined;
  window.onYouTubeIframeAPIReady = undefined;
  const scripts = Array.from(
    document.querySelectorAll(`script[src="${youtubeIframeApiSrc}"]`)
  );
  for (const script of scripts) {
    script.remove();
  }
}

function mockScriptAppend(): HTMLScriptElement[] {
  const scripts: HTMLScriptElement[] = [];
  vi.spyOn(document.head, "append").mockImplementation(
    (...nodes: (Node | string)[]) => {
      for (const node of nodes) {
        if (node instanceof HTMLScriptElement) {
          scripts.push(node);
        }
      }
    }
  );
  return scripts;
}

describe("youtube iframe runtime", () => {
  afterEach(() => {
    fakePlayerCommandCount = 0;
    fakePlayerOptions = null;
    vi.useRealTimers();
    vi.restoreAllMocks();
    cleanupYouTubeGlobals();
  });

  it("resolves immediately when the iframe API is already ready", async () => {
    const api = createApi();
    window.YT = api;
    const { loadYouTubeIframeApi } = await importRuntime();

    await expect(loadYouTubeIframeApi()).resolves.toBe(api);
    expect(document.querySelector(`script[src="${youtubeIframeApiSrc}"]`)).toBe(
      null
    );
  });

  it("shares a script across concurrent loads and preserves the host callback", async () => {
    const api = createApi();
    const previousReady = vi.fn();
    window.onYouTubeIframeAPIReady = previousReady;
    const appendedScripts = mockScriptAppend();
    const { loadYouTubeIframeApi } = await importRuntime();
    const pending = loadYouTubeIframeApi();
    const concurrent = loadYouTubeIframeApi();
    window.YT = api;
    window.onYouTubeIframeAPIReady?.();

    await expect(pending).resolves.toBe(api);
    await expect(concurrent).resolves.toBe(api);
    expect(previousReady).toHaveBeenCalledOnce();
    expect(window.onYouTubeIframeAPIReady).toBe(previousReady);
    expect(appendedScripts.map((script) => script.src)).toEqual([
      youtubeIframeApiSrc,
    ]);
  });

  it("recovers when an existing script never calls the global callback", async () => {
    vi.useFakeTimers();
    const script = document.createElement("script");
    script.src = youtubeIframeApiSrc;
    script.type = "application/json";
    document.head.append(script);
    const api = createApi();
    const { loadYouTubeIframeApi } = await importRuntime();

    const pending = loadYouTubeIframeApi();
    window.onYouTubeIframeAPIReady = undefined;
    window.YT = api;
    await vi.advanceTimersByTimeAsync(50);

    await expect(pending).resolves.toBe(api);
    expect(
      document.querySelectorAll(`script[src="${youtubeIframeApiSrc}"]`)
    ).toHaveLength(1);
  });

  it("rejects instead of hanging when the iframe API never becomes ready", async () => {
    vi.useFakeTimers();
    mockScriptAppend();
    const { loadYouTubeIframeApi } = await importRuntime();

    const pending = loadYouTubeIframeApi();
    const assertion = expect(pending).rejects.toThrow(
      "Timed out loading YouTube iframe API."
    );
    await vi.advanceTimersByTimeAsync(8000);

    await assertion;
  });

  it("passes origin and widget referrer into playerVars", async () => {
    window.YT = createApi();
    const { defaultYouTubeAdapterRuntime } = await importRuntime();

    const pending = defaultYouTubeAdapterRuntime.createPlayer({
      element: document.createElement("div"),
      onError: () => undefined,
      onPlaybackRateChange: () => undefined,
      onReady: () => undefined,
      onStateChange: () => undefined,
      origin: "https://player.example",
      videoId: "M7lc1UVf-VE",
      widgetReferrer: "https://consumer.example",
    });

    await Promise.resolve();
    getFakePlayerOptions().events.onReady();
    await pending;

    expect(getFakePlayerOptions().playerVars).toMatchObject({
      origin: "https://player.example",
      widget_referrer: "https://consumer.example",
    });
  });
});

function getFakePlayerOptions(): YouTubeIframePlayerOptions {
  if (!fakePlayerOptions) {
    throw new Error("Missing fake YouTube player options.");
  }
  return fakePlayerOptions;
}
