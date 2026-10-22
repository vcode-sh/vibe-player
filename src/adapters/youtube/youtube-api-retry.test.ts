import { afterEach, describe, expect, it, vi } from "vitest";
import { createDelayedYouTubeApi } from "./youtube-player-readiness-test-helpers";

const apiUrl = "https://www.youtube.com/iframe_api";

function isolateScriptLoading() {
  const created: HTMLScriptElement[] = [];
  const append = document.head.append.bind(document.head);
  vi.spyOn(document.head, "append").mockImplementation((...nodes) => {
    for (const node of nodes) {
      if (node instanceof HTMLScriptElement) {
        node.type = "application/json";
        created.push(node);
      }
    }
    append(...nodes);
  });
  return created;
}

function getScript(scripts: HTMLScriptElement[], index: number) {
  const script = scripts[index];
  if (!script) {
    throw new Error(`Missing script attempt ${index}`);
  }
  return script;
}

describe("YouTube iframe API retry", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    window.YT = undefined;
    window.onYouTubeIframeAPIReady = undefined;
    for (const script of document.querySelectorAll(`script[src="${apiUrl}"]`)) {
      script.remove();
    }
  });

  it("retries a package-owned failed script while sharing the next active attempt", async () => {
    vi.resetModules();
    const scripts = isolateScriptLoading();
    const { loadYouTubeIframeApi } = await import("./youtube-iframe-runtime");
    const first = loadYouTubeIframeApi();
    const failed = expect(first).rejects.toThrow(
      "Failed to load YouTube iframe API."
    );
    getScript(scripts, 0).dispatchEvent(new Event("error"));
    await failed;

    const retry = loadYouTubeIframeApi();
    const concurrent = loadYouTubeIframeApi();
    expect(retry).not.toBe(first);
    expect(concurrent).toBe(retry);
    expect(getScript(scripts, 0).isConnected).toBe(false);
    expect(getScript(scripts, 1).isConnected).toBe(true);
    const { api } = createDelayedYouTubeApi();
    window.YT = api;
    window.onYouTubeIframeAPIReady?.();
    await expect(retry).resolves.toBe(api);
  });

  it("preserves a failed host script and host callback when retrying", async () => {
    vi.useFakeTimers();
    vi.resetModules();
    const host = document.createElement("script");
    host.type = "application/json";
    host.src = apiUrl;
    document.head.append(host);
    const previousReady = vi.fn();
    window.onYouTubeIframeAPIReady = previousReady;
    const scripts = isolateScriptLoading();
    const { loadYouTubeIframeApi } = await import("./youtube-iframe-runtime");
    const first = loadYouTubeIframeApi();
    const failed = expect(first).rejects.toThrow(
      "Timed out loading YouTube iframe API."
    );
    await vi.advanceTimersByTimeAsync(8000);
    await failed;

    const retry = loadYouTubeIframeApi();
    expect(host.isConnected).toBe(true);
    expect(scripts).toHaveLength(1);
    const { api } = createDelayedYouTubeApi();
    window.YT = api;
    window.onYouTubeIframeAPIReady?.();
    await expect(retry).resolves.toBe(api);
    expect(previousReady).toHaveBeenCalledOnce();
    expect(window.onYouTubeIframeAPIReady).toBe(previousReady);
  });
});
