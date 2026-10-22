import { afterEach, describe, expect, it, vi } from "vitest";
import { createYouTubeAdapter } from "./create-youtube-adapter";
import {
  collectYouTubeAdapterEvents,
  createYouTubeRuntime,
  youtubeSource,
} from "./youtube-adapter-test-helpers";

function setFullscreenElement(element: Element | null): void {
  Object.defineProperty(document, "fullscreenElement", {
    configurable: true,
    value: element,
  });
  document.dispatchEvent(new Event("fullscreenchange"));
}

describe("YouTube presentation ownership", () => {
  afterEach(() => {
    setFullscreenElement(null);
    vi.restoreAllMocks();
  });

  it("keeps package controls in fullscreen and observes browser exit", async () => {
    const { probe, runtime } = createYouTubeRuntime();
    const adapter = createYouTubeAdapter(runtime);
    const target = document.createElement("div");
    const stage = document.createElement("section");
    stage.append(target, document.createElement("button"));
    stage.requestFullscreen = vi.fn(async () => setFullscreenElement(stage));
    probe.iframe.requestFullscreen = vi.fn(async () =>
      setFullscreenElement(probe.iframe)
    );
    await adapter.mount(target, stage);
    await adapter.load(youtubeSource);
    const events = collectYouTubeAdapterEvents(adapter);
    try {
      expect(adapter.capabilities.canFullscreen).toBe(true);
      await adapter.enterFullscreen?.();
      expect(document.fullscreenElement).toBe(stage);
      expect(probe.iframe.requestFullscreen).not.toHaveBeenCalled();
      expect(events.at(-1)).toMatchObject({
        snapshot: { isFullscreen: true },
        type: "fullscreenchange",
      });
      setFullscreenElement(null);
      expect(events.at(-1)).toMatchObject({
        snapshot: { isFullscreen: false },
        type: "fullscreenchange",
      });
    } finally {
      await adapter.unmount();
    }
  });

  it("reports unsupported host fullscreen and stops events after unmount", async () => {
    const { probe, runtime } = createYouTubeRuntime();
    const adapter = createYouTubeAdapter(runtime);
    const target = document.createElement("div");
    await adapter.mount(target);
    await adapter.load(youtubeSource);
    expect(adapter.capabilities.canFullscreen).toBe(false);
    await adapter.enterFullscreen?.();
    expect(document.fullscreenElement).toBe(null);
    expect(probe.destroyed).toBe(false);
    const events = collectYouTubeAdapterEvents(adapter);
    await adapter.unmount();
    setFullscreenElement(target);
    setFullscreenElement(null);
    expect(events).toEqual([]);
  });
});
