import { afterEach, expect, it, vi } from "vitest";
import { VibePlayerController } from "../../core/vibe-player-controller";
import type { VibePlayerWatchedRangesReport } from "../../core/vibe-player-watched-ranges";
import { createFileAdapter } from "../file/create-file-adapter";

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

it.each(["native", "controller"] as const)(
  "%s seeks preserve replay time and exclude small forward jumps without duplicate reports",
  async (origin) => {
    vi.useFakeTimers();
    vi.spyOn(HTMLMediaElement.prototype, "load").mockImplementation(
      () => undefined
    );
    const video = document.createElement("video");
    document.body.append(video);
    let paused = true;
    let readyState = 4;
    let seeking = false;
    Object.defineProperties(video, {
      duration: { configurable: true, value: 100 },
      paused: { configurable: true, get: () => paused },
      readyState: { configurable: true, get: () => readyState },
      seeking: { configurable: true, get: () => seeking },
    });
    const reports: VibePlayerWatchedRangesReport[] = [];
    const controller = new VibePlayerController({
      adapterFactory: createFileAdapter,
      onAnalyticsEvent: (event) => {
        if (event.type === "seek") {
          controller.flushWatchedRanges();
        }
      },
      onWatchedRanges: (report) => reports.push(report),
    });
    const progress = (seconds: number) => {
      for (let elapsed = 0; elapsed < seconds; elapsed += 0.25) {
        vi.advanceTimersByTime(250);
        video.currentTime += 0.25;
        video.dispatchEvent(new Event("timeupdate"));
      }
    };
    const nativeSeek = async (seconds: number) => {
      if (origin === "controller") {
        await controller.seekTo(seconds);
      }
      seeking = true;
      video.currentTime = seconds;
      video.dispatchEvent(new Event("seeking"));
      video.dispatchEvent(new Event("timeupdate"));
      readyState = 2;
      seeking = false;
      video.dispatchEvent(new Event("seeked"));
    };
    try {
      await controller.mount(video);
      await controller.load({ id: "film", type: "mp4", url: "/film.mp4" });
      paused = false;
      video.dispatchEvent(new Event("playing"));
      progress(2);
      await nativeSeek(0);
      progress(1);
      await nativeSeek(1.5);
      progress(1);
      expect(controller.getState().snapshot.readyState).toBe("playing");
      video.dispatchEvent(new Event("waiting"));
      vi.advanceTimersByTime(1000);
      video.dispatchEvent(new Event("timeupdate"));
      expect(controller.getState().snapshot.readyState).toBe("buffering");
      paused = true;
      video.dispatchEvent(new Event("pause"));
      await nativeSeek(8);
      expect(controller.getState().snapshot.paused).toBe(true);
      expect(controller.getState().snapshot.readyState).toBe("ready");

      expect(reports.map(({ ranges }) => ranges)).toEqual([
        [{ end: 2, start: 0 }],
        [{ end: 1, start: 0 }],
        [{ end: 2.5, start: 1.5 }],
      ]);
    } finally {
      await controller.teardown();
      video.remove();
    }
  }
);
