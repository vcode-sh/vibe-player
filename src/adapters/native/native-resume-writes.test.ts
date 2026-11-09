import { afterEach, expect, it, vi } from "vitest";
import { VibePlayerController } from "../../core/vibe-player-controller";
import { createFileAdapter } from "../file/create-file-adapter";

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

it.each(["media", "controller"] as const)(
  "saves a %s seek on the file adapter once, after it settled",
  async (origin) => {
    vi.useFakeTimers();
    vi.spyOn(HTMLMediaElement.prototype, "load").mockImplementation(
      () => undefined
    );
    const video = document.createElement("video");
    document.body.append(video);
    let paused = true;
    Object.defineProperties(video, {
      duration: { configurable: true, value: 100 },
      paused: { configurable: true, get: () => paused },
      readyState: { configurable: true, value: 4 },
    });
    const writes: (number | string | undefined)[][] = [];
    const controller = new VibePlayerController({
      adapterFactory: createFileAdapter,
      resumeStore: {
        clear: () => undefined,
        get: () => null,
        set: (_sourceId, seconds, context) => {
          writes.push([seconds, context?.reason]);
        },
      },
    });
    const progress = (seconds: number) => {
      for (let elapsed = 0; elapsed < seconds; elapsed += 0.25) {
        vi.advanceTimersByTime(250);
        video.currentTime += 0.25;
        video.dispatchEvent(new Event("timeupdate"));
      }
    };
    try {
      await controller.mount(video);
      await controller.load({ id: "film", type: "mp4", url: "/film.mp4" });
      paused = false;
      video.dispatchEvent(new Event("playing"));
      progress(2.5);
      if (origin === "controller") {
        // Reports a synthetic timeupdate before the media echoes the seek.
        await controller.seekTo(40);
      }
      video.currentTime = 40;
      for (const type of ["seeking", "timeupdate", "seeked"]) {
        video.dispatchEvent(new Event(type));
      }
      progress(1);
      paused = true;
      video.dispatchEvent(new Event("pause"));

      expect(writes).toEqual([
        [2, "progress"],
        [40, "seek"],
        [41, "pause"],
      ]);
    } finally {
      await controller.teardown();
      video.remove();
    }
  }
);
