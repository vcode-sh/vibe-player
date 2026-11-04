import { afterEach, describe, expect, it, vi } from "vitest";
import { createDelayedYouTubeApi } from "./youtube-player-readiness-test-helpers";

const youtubeIframeApiSrc = "https://www.youtube.com/iframe_api";

function createApi() {
  return createDelayedYouTubeApi().api;
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
    expect(vi.getTimerCount()).toBe(0);
    expect(window.onYouTubeIframeAPIReady).toBeUndefined();
  });
});
