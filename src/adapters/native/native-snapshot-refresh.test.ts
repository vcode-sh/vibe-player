import { afterEach, describe, expect, it, vi } from "vitest";
import { VibePlayerController } from "../../core/vibe-player-controller";
import { createFileAdapter } from "../file/create-file-adapter";
import { createSingleFileSource } from "../file/file-adapter-test-helpers";
import {
  defineNativeVideoBooleanProperty,
  defineNativeVideoNumberProperty,
  getMountedNativeVideo,
} from "./native-video-test-helpers";

const controllers = new Set<VibePlayerController>();

async function loadPlayingFile() {
  vi.spyOn(HTMLMediaElement.prototype, "load").mockImplementation(
    () => undefined
  );
  const events: string[] = [];
  const controller = new VibePlayerController({
    adapterFactory: createFileAdapter,
    onEvent: (event) => events.push(event.type),
  });
  controllers.add(controller);
  const target = document.createElement("div");
  await controller.mount(target);
  await controller.load({ ...createSingleFileSource(), autoPlay: false });
  const video = getMountedNativeVideo(target);
  defineNativeVideoBooleanProperty(video, "paused", false);
  defineNativeVideoNumberProperty(video, "readyState", 4);
  defineNativeVideoNumberProperty(video, "duration", 40);
  video.dispatchEvent(new Event("playing"));
  return { controller, events, video };
}

function defineBuffered(video: HTMLVideoElement, end: number): void {
  Object.defineProperty(video, "buffered", {
    configurable: true,
    value: { end: () => end, length: 1, start: () => 0 },
  });
}

describe("native snapshot refresh", () => {
  afterEach(async () => {
    await Promise.all([...controllers].map((item) => item.teardown()));
    controllers.clear();
    vi.restoreAllMocks();
  });

  it("keeps playing from buffer when the network stalls", async () => {
    const { controller, events, video } = await loadPlayingFile();
    defineBuffered(video, 10);
    video.dispatchEvent(new Event("stalled"));
    expect(controller.getState().snapshot.readyState).toBe("playing");
    expect(controller.getState().snapshot.bufferedPct).toBe(25);
    expect(events).not.toContain("buffering");
  });

  it("refreshes the buffered amount on progress and the size on resize", async () => {
    const { controller, events, video } = await loadPlayingFile();
    defineBuffered(video, 30);
    video.dispatchEvent(new Event("progress"));
    expect(controller.getState().snapshot.bufferedPct).toBe(75);

    Object.defineProperty(video, "videoWidth", { value: 1280 });
    Object.defineProperty(video, "videoHeight", { value: 720 });
    video.dispatchEvent(new Event("resize"));
    expect(controller.getState().snapshot).toMatchObject({
      videoHeight: 720,
      videoWidth: 1280,
    });
    expect(events).not.toContain("progress");
    expect(events).not.toContain("resize");
  });
});
