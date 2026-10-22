import { afterEach, describe, expect, it, vi } from "vitest";
import type { VibePlayerAdapterEvent } from "../../core/vibe-player-types";
import { createFileAdapter } from "../file/create-file-adapter";
import { getMountedNativeVideo } from "./native-video-test-helpers";

const source = {
  id: "presentation",
  sources: [{ mimeType: "video/mp4", url: "/movie.mp4" }],
  type: "file",
} as const;

function setFullscreenElement(element: Element | null): void {
  Object.defineProperty(document, "fullscreenElement", {
    configurable: true,
    value: element,
  });
  document.dispatchEvent(new Event("fullscreenchange"));
}

describe("native presentation ownership", () => {
  afterEach(() => {
    setFullscreenElement(null);
    vi.restoreAllMocks();
    document.body.replaceChildren();
  });

  it("enters the presentation container and follows browser fullscreen exit", async () => {
    vi.spyOn(HTMLMediaElement.prototype, "load").mockImplementation(
      () => undefined
    );
    const adapter = createFileAdapter();
    const target = document.createElement("div");
    const stage = document.createElement("section");
    stage.append(target, document.createElement("button"));
    document.body.append(stage);
    const request = vi.fn(async () => setFullscreenElement(stage));
    stage.requestFullscreen = request;
    await adapter.mount(target, stage);
    await adapter.load(source);
    const video = getMountedNativeVideo(target);
    video.requestFullscreen = vi.fn(async () => setFullscreenElement(video));
    const events: VibePlayerAdapterEvent[] = [];
    const unsubscribe = adapter.subscribe((event) => events.push(event));

    await adapter.enterFullscreen?.();
    expect(document.fullscreenElement).toBe(stage);
    expect(adapter.getSnapshot().isFullscreen).toBe(true);
    expect(request).toHaveBeenCalledOnce();
    setFullscreenElement(null);
    expect(events.at(-1)).toMatchObject({
      snapshot: { isFullscreen: false },
      type: "fullscreenchange",
    });
    unsubscribe();
    await adapter.unmount();
  });

  it("updates the presentation target without recreating media and disposes event listeners", async () => {
    vi.spyOn(HTMLMediaElement.prototype, "load").mockImplementation(
      () => undefined
    );
    const adapter = createFileAdapter();
    const target = document.createElement("div");
    const former = document.createElement("section");
    const current = document.createElement("section");
    former.requestFullscreen = vi.fn(async () => setFullscreenElement(former));
    current.requestFullscreen = vi.fn(async () =>
      setFullscreenElement(current)
    );
    const events: VibePlayerAdapterEvent[] = [];
    adapter.subscribe((event) => events.push(event));
    await adapter.mount(target, former);
    await adapter.load(source);
    const video = getMountedNativeVideo(target);
    video.requestFullscreen = vi.fn(async () => setFullscreenElement(video));
    video.currentTime = 17;
    await adapter.mount(target, current);
    await adapter.enterFullscreen?.();
    expect(document.fullscreenElement).toBe(current);
    expect(getMountedNativeVideo(target)).toBe(video);
    expect(adapter.getSnapshot().currentTime).toBe(17);
    await adapter.unmount();
    events.length = 0;
    setFullscreenElement(former);
    setFullscreenElement(null);
    expect(events).toEqual([]);
  });
});
