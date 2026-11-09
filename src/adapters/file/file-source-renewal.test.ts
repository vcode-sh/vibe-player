import { afterEach, describe, expect, it, vi } from "vitest";
import { VibePlayerController } from "../../core/vibe-player-controller";
import type {
  VibePlayerFileSource,
  VibePlayerSource,
} from "../../core/vibe-player-types";
import {
  defineNativeVideoNumberProperty,
  getMountedNativeVideo,
} from "../native/native-video-test-helpers";
import { createFileAdapter } from "./create-file-adapter";
import {
  createSingleFileSource,
  fileSource,
} from "./file-adapter-test-helpers";

const controllers = new Set<VibePlayerController>();
const signed = { ...createSingleFileSource(), autoPlay: false };
const renewed: VibePlayerFileSource = {
  ...signed,
  sources: [{ mimeType: "video/mp4", url: "https://example.com/fresh.mp4" }],
};

async function loadSigned(source: VibePlayerSource = signed) {
  vi.spyOn(HTMLMediaElement.prototype, "load").mockImplementation(
    () => undefined
  );
  const renewSource = vi.fn(async () => renewed);
  const onError = vi.fn();
  const controller = new VibePlayerController({
    adapterFactory: createFileAdapter,
    onError,
    renewSource,
  });
  controllers.add(controller);
  const target = document.createElement("div");
  await controller.mount(target);
  await controller.load(source);
  const video = () => getMountedNativeVideo(target);
  return { controller, onError, renewSource, video };
}

/** An expired or forbidden file URL is MediaError 4 before media data loaded. */
function rejectDelivery(video: HTMLVideoElement, readyState = 0): void {
  defineNativeVideoNumberProperty(video, "readyState", readyState);
  Object.defineProperty(video, "error", {
    configurable: true,
    value: { code: 4, message: "MEDIA_ELEMENT_ERROR: Format error" },
  });
  video.dispatchEvent(new Event("error"));
}

describe("file delivery renewal", () => {
  afterEach(async () => {
    await Promise.all([...controllers].map((item) => item.teardown()));
    controllers.clear();
    vi.restoreAllMocks();
  });

  it("renews a file that failed before media data loaded, once per lapse", async () => {
    const { controller, onError, renewSource, video } = await loadSigned();

    rejectDelivery(video());
    await vi.waitFor(() =>
      expect(controller.getState().currentSource).toEqual(renewed)
    );
    expect(renewSource).toHaveBeenCalledTimes(1);
    expect(onError).not.toHaveBeenCalled();

    rejectDelivery(video());
    expect(renewSource).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ kind: "source", phase: "playback" })
    );
  });

  it("renews when every <source> candidate failed before media data", async () => {
    const { controller, renewSource, video } = await loadSigned(fileSource);
    for (const candidate of Array.from(video().querySelectorAll("source"))) {
      candidate.dispatchEvent(new Event("error"));
    }
    await vi.waitFor(() =>
      expect(controller.getState().currentSource).toEqual(renewed)
    );
    expect(renewSource).toHaveBeenCalledTimes(1);
  });

  it("plays the renewed delivery when every <source> failed during play", async () => {
    const { controller, video } = await loadSigned(fileSource);
    const target = video().parentElement;
    if (!target) {
      throw new Error("Expected a mounted video.");
    }
    // Native playback only keeps playing in a connected element.
    document.body.append(target);
    const play = vi.spyOn(HTMLMediaElement.prototype, "play");
    await controller.play();
    expect(video().paused).toBe(false);
    const playsBeforeFailure = play.mock.calls.length;

    for (const candidate of Array.from(video().querySelectorAll("source"))) {
      candidate.dispatchEvent(new Event("error"));
    }

    await vi.waitFor(() =>
      expect(controller.getState().currentSource).toEqual(renewed)
    );
    await vi.waitFor(() =>
      expect(play.mock.calls.length).toBeGreaterThan(playsBeforeFailure)
    );
    expect(controller.getState().error).toBeNull();
    target.remove();
  });

  it("reports an unsupported file after metadata without renewing", async () => {
    const { controller, onError, renewSource, video } = await loadSigned();
    rejectDelivery(video(), 1);
    expect(renewSource).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledTimes(1);
    expect(controller.getState().error?.kind).toBe("source");
  });
});
