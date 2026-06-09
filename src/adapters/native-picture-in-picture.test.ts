import { afterEach, describe, expect, it, vi } from "vitest";
import type { VibePlayerFileSource, VibePlayerHlsSource } from "../core";
import { createFileAdapter } from "./create-file-adapter";
import { createHlsAdapter } from "./create-hls-adapter";
import type { HlsAdapterRuntime } from "./hls-runtime-types";
import {
  canUseNativePictureInPicture,
  enterNativePictureInPicture,
} from "./native-picture-in-picture";

const fileSource: VibePlayerFileSource = {
  id: "file-pip",
  sources: [{ mimeType: "video/mp4", url: "https://example.com/video.mp4" }],
  type: "file",
};

const hlsSource: VibePlayerHlsSource = {
  id: "hls-pip",
  manifestUrl: "https://example.com/stream.m3u8",
  type: "hls",
};

function definePictureInPictureDocument(
  element: Element | null = null,
  exitPictureInPicture: () => Promise<void> = () => Promise.resolve()
): void {
  Object.defineProperty(document, "pictureInPictureEnabled", {
    configurable: true,
    value: true,
  });
  Object.defineProperty(document, "pictureInPictureElement", {
    configurable: true,
    value: element,
  });
  Object.defineProperty(document, "exitPictureInPicture", {
    configurable: true,
    value: exitPictureInPicture,
  });
}

function definePictureInPictureVideo(
  video: HTMLVideoElement,
  requestPictureInPicture: HTMLVideoElement["requestPictureInPicture"]
): void {
  Object.defineProperty(video, "requestPictureInPicture", {
    configurable: true,
    value: requestPictureInPicture,
  });
}

function getMountedVideo(target: HTMLElement): HTMLVideoElement {
  const video = target.querySelector("video");
  if (!(video instanceof HTMLVideoElement)) {
    throw new Error("Expected mounted video element.");
  }
  return video;
}

function clearDocumentOverrides(): void {
  Object.defineProperty(document, "exitPictureInPicture", {
    configurable: true,
    value: undefined,
  });
  Object.defineProperty(document, "pictureInPictureElement", {
    configurable: true,
    value: null,
  });
  Object.defineProperty(document, "pictureInPictureEnabled", {
    configurable: true,
    value: false,
  });
}

function createPictureInPictureWindow(): PictureInPictureWindow {
  return { height: 180, width: 320 } as PictureInPictureWindow;
}

describe("native picture-in-picture", () => {
  afterEach(() => {
    clearDocumentOverrides();
    vi.restoreAllMocks();
  });

  it("detects and enters native picture-in-picture", async () => {
    const video = document.createElement("video");
    const requestPictureInPicture = vi.fn(() =>
      Promise.resolve(createPictureInPictureWindow())
    );
    definePictureInPictureDocument();
    definePictureInPictureVideo(video, requestPictureInPicture);

    expect(canUseNativePictureInPicture(video)).toBe(true);
    await enterNativePictureInPicture(video);

    expect(requestPictureInPicture).toHaveBeenCalledTimes(1);
  });

  it("exits native picture-in-picture when the same video is active", async () => {
    const video = document.createElement("video");
    const exitPictureInPicture = vi.fn(() => Promise.resolve());
    const requestPictureInPicture = vi.fn(() =>
      Promise.resolve(createPictureInPictureWindow())
    );
    definePictureInPictureDocument(video, exitPictureInPicture);
    definePictureInPictureVideo(video, requestPictureInPicture);

    await enterNativePictureInPicture(video);

    expect(exitPictureInPicture).toHaveBeenCalledTimes(1);
    expect(requestPictureInPicture).not.toHaveBeenCalled();
  });

  it("exposes file adapter native picture-in-picture capability", async () => {
    vi.spyOn(HTMLMediaElement.prototype, "load").mockImplementation(
      () => undefined
    );
    const adapter = createFileAdapter();
    const target = document.createElement("div");
    await adapter.mount(target);
    await adapter.load(fileSource);

    const requestPictureInPicture = vi.fn(() =>
      Promise.resolve(createPictureInPictureWindow())
    );
    const video = getMountedVideo(target);
    definePictureInPictureDocument();
    definePictureInPictureVideo(video, requestPictureInPicture);

    expect(adapter.capabilities.canPictureInPicture).toBe(true);
    await adapter.enterPictureInPicture?.();

    expect(requestPictureInPicture).toHaveBeenCalledTimes(1);
  });

  it("exposes HLS adapter native picture-in-picture capability", async () => {
    vi.spyOn(HTMLMediaElement.prototype, "canPlayType").mockReturnValue("");
    vi.spyOn(HTMLMediaElement.prototype, "load").mockImplementation(
      () => undefined
    );
    const runtime: HlsAdapterRuntime = {
      attachManagedHls: () => ({
        destroy: () => undefined,
        setQualityLevel: () => undefined,
      }),
      canUseManagedHls: () => true,
    };
    const adapter = createHlsAdapter(runtime);
    const target = document.createElement("div");
    await adapter.mount(target);
    await adapter.load(hlsSource);

    const requestPictureInPicture = vi.fn(() =>
      Promise.resolve(createPictureInPictureWindow())
    );
    const video = getMountedVideo(target);
    definePictureInPictureDocument();
    definePictureInPictureVideo(video, requestPictureInPicture);

    expect(adapter.capabilities.canPictureInPicture).toBe(true);
    await adapter.enterPictureInPicture?.();

    expect(requestPictureInPicture).toHaveBeenCalledTimes(1);
  });
});
